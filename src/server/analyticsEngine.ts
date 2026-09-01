import { getStore } from './storage.ts';
import {
  TalentGapAnalysis,
  TalentGapSkill,
  OpportunityFunnelAnalytics,
  OpportunityStatus,
  ApplicationStatus,
  SkillLevel,
} from '../types.ts';
import { calculateOpportunityMatch } from '../lib/matching.ts';

/**
 * -------------------------------------------------------------
 * TALENT GAP ANALYSIS (Deterministic, SES 4.4 Standard)
 * -------------------------------------------------------------
 * Evaluates real structured student pool data against requirements
 * of active/open opportunities. Does NOT use generative hallucinations.
 */
export function generateTalentGapAnalysis(): TalentGapAnalysis {
  const store = getStore();
  const openOpportunities = store.opportunities.filter(
    o => o.status === OpportunityStatus.OPEN || o.status === OpportunityStatus.DRAFT
  );

  const skillGaps: TalentGapSkill[] = store.skills.map(skill => {
    const category = store.categories.find(c => c.category_id === skill.category_id);
    const catName = category ? category.name : 'Umum';

    // Find opportunities that explicitly or implicitly require this skill
    const requiringOpps = openOpportunities.filter(opp => {
      const hasReq = (opp.requirements || []).some(
        r => r.skill_id === skill.skill_id || (r.skill_name && r.skill_name.toLowerCase() === skill.skill_name.toLowerCase())
      );
      const hasRole = (opp.open_call_roles || []).some(
        role => role.toLowerCase().includes(skill.skill_name.toLowerCase()) || skill.skill_name.toLowerCase().includes(role.toLowerCase())
      );
      const catMatch = opp.category_id === skill.category_id;
      return hasReq || hasRole || catMatch;
    }).map(o => o.title);

    // Count students with this skill and their proficiency
    const studentSkillRecords = store.studentSkills.filter(ss => ss.skill_id === skill.skill_id);
    const availableCount = studentSkillRecords.length;

    const advancedCount = studentSkillRecords.filter(ss => ss.skill_level === SkillLevel.ADVANCED).length;
    const intermediateCount = studentSkillRecords.filter(ss => ss.skill_level === SkillLevel.INTERMEDIATE).length;
    const beginnerCount = studentSkillRecords.filter(ss => ss.skill_level === SkillLevel.BEGINNER).length;

    let coverageStatus: 'SUFFICIENT' | 'LOW' | 'MISSING' = 'SUFFICIENT';
    let recommendation = 'Bakat mencukupi untuk keperluan aktiviti semasa.';

    if (availableCount === 0) {
      coverageStatus = 'MISSING';
      recommendation = `Tiada pelajar berdaftar untuk ${skill.skill_name}. Cadangkan hebahan pencarian bakat baharu atau bengkel pengenalan.`;
    } else if (availableCount < 2 || (requiringOpps.length > 0 && availableCount < 3 && advancedCount === 0)) {
      coverageStatus = 'LOW';
      recommendation = `Bekalan bakat terhad (${availableCount} calon). Perlu pengesanan bakat tambahan bagi mengukuhkan barisan pelapis.`;
    } else if (advancedCount >= 1 || intermediateCount >= 2) {
      coverageStatus = 'SUFFICIENT';
      recommendation = `Bakat stabil dengan ${advancedCount} calon mahir (Advanced) dan ${intermediateCount} pertengahan.`;
    }

    return {
      skill_name: skill.skill_name,
      category_name: catName,
      required_by_opportunities: requiringOpps,
      available_students_count: availableCount,
      advanced_count: advancedCount,
      intermediate_count: intermediateCount,
      beginner_count: beginnerCount,
      coverage_status: coverageStatus,
      recommendation,
    };
  });

  // Sort by MISSING first, then LOW, then SUFFICIENT
  skillGaps.sort((a, b) => {
    const order = { MISSING: 0, LOW: 1, SUFFICIENT: 2 };
    return order[a.coverage_status] - order[b.coverage_status];
  });

  return {
    total_skills_evaluated: skillGaps.length,
    sufficient_count: skillGaps.filter(s => s.coverage_status === 'SUFFICIENT').length,
    low_count: skillGaps.filter(s => s.coverage_status === 'LOW').length,
    missing_count: skillGaps.filter(s => s.coverage_status === 'MISSING').length,
    skill_gaps: skillGaps,
    generated_at: new Date().toISOString(),
  };
}

/**
 * -------------------------------------------------------------
 * OPPORTUNITY FUNNEL & METRICS ANALYTICS
 * -------------------------------------------------------------
 */
export function generateOpportunityAnalytics(opportunityId?: string): OpportunityFunnelAnalytics[] {
  const store = getStore();
  let targetOpps = store.opportunities;
  if (opportunityId) {
    targetOpps = targetOpps.filter(o => o.opportunity_id === opportunityId);
  }

  // Pre-enrich students
  const enrichedStudents = store.students.map(s => {
    const sSkills = store.studentSkills.filter(ss => ss.student_id === s.student_id);
    const skillsWithDetails = sSkills.map(ss => {
      const sk = store.skills.find(k => k.skill_id === ss.skill_id);
      return {
        ...ss,
        skill_name: sk ? sk.skill_name : 'Unknown Skill',
      };
    });
    return {
      ...s,
      skills: skillsWithDetails,
    };
  });

  return targetOpps.map(opp => {
    const cat = store.categories.find(c => c.category_id === opp.category_id);
    const apps = store.applications.filter(a => a.opportunity_id === opp.opportunity_id);

    const totalApps = apps.length;
    const screeningCount = apps.filter(a =>
      [ApplicationStatus.SCREENING, ApplicationStatus.VIDEO_REQUESTED, ApplicationStatus.INTERVIEW, ApplicationStatus.TRIAL].includes(a.status)
    ).length;
    const shortlistedCount = apps.filter(a =>
      [ApplicationStatus.SHORTLISTED, ApplicationStatus.SELECTED, ApplicationStatus.CONFIRMED].includes(a.status)
    ).length;
    const selectedCount = apps.filter(a =>
      [ApplicationStatus.SELECTED, ApplicationStatus.CONFIRMED].includes(a.status)
    ).length;
    const confirmedCount = apps.filter(a => a.status === ApplicationStatus.CONFIRMED).length;

    // Participation records matching this opportunity
    const participationCount = store.participationHistory.filter(
      p => p.opportunity_id === opp.opportunity_id || (p.opportunity_title && p.opportunity_title.toLowerCase() === opp.title.toLowerCase())
    ).length;

    const conversionRate = totalApps > 0 ? Math.round((selectedCount / totalApps) * 100) : 0;

    // Calculate Top Matched Talents in entire student pool
    const topMatches = enrichedStudents.map(student => {
      const match = calculateOpportunityMatch(opp, student);
      return {
        student_name: student.full_name,
        student_id_number: student.student_id_number,
        score: match.score,
      };
    })
    .filter(m => m.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

    // Identify unmet requirements
    const unmetRequirements: string[] = [];
    (opp.requirements || []).forEach(req => {
      const matchingCount = store.studentSkills.filter(ss => {
        const sk = store.skills.find(k => k.skill_id === ss.skill_id);
        const nameMatch = req.skill_name ? sk?.skill_name.toLowerCase() === req.skill_name.toLowerCase() : false;
        const idMatch = req.skill_id ? ss.skill_id === req.skill_id : false;
        return nameMatch || idMatch;
      }).length;

      if (matchingCount === 0) {
        unmetRequirements.push(`${req.skill_name || 'Kemahiran'}: 0 calon berdaftar dalam pangkalan data.`);
      }
    });

    return {
      opportunity_id: opp.opportunity_id,
      title: opp.title,
      category_name: cat?.name || 'Umum',
      total_applications: totalApps,
      screening_count: screeningCount,
      shortlisted_count: shortlistedCount,
      selected_count: selectedCount,
      confirmed_count: confirmedCount,
      participation_count: participationCount,
      conversion_rate_percent: conversionRate,
      top_matched_talents: topMatches,
      unmet_requirements: unmetRequirements,
    };
  });
}

/**
 * -------------------------------------------------------------
 * COMPREHENSIVE ADMIN OPERATIONS SUMMARY REPORT
 * -------------------------------------------------------------
 */
export function generateAdminOperationalReport() {
  const store = getStore();

  const totalStudents = store.students.length;
  const studentsWithSkills = new Set(store.studentSkills.map(ss => ss.student_id)).size;
  const talentRegistrationRate = totalStudents > 0 ? Math.round((studentsWithSkills / totalStudents) * 100) : 0;

  const totalOpportunities = store.opportunities.length;
  const activeOpportunities = store.opportunities.filter(o => o.status === OpportunityStatus.OPEN).length;
  const closedOpportunities = store.opportunities.filter(o => o.status === OpportunityStatus.CLOSED).length;
  const archivedOpportunities = store.opportunities.filter(o => o.status === OpportunityStatus.ARCHIVED).length;

  const totalApplications = store.applications.length;
  const appStatusBreakdown = {
    SUBMITTED: store.applications.filter(a => a.status === ApplicationStatus.SUBMITTED).length,
    SCREENING: store.applications.filter(a => [ApplicationStatus.SCREENING, ApplicationStatus.VIDEO_REQUESTED, ApplicationStatus.INTERVIEW, ApplicationStatus.TRIAL].includes(a.status)).length,
    SHORTLISTED: store.applications.filter(a => a.status === ApplicationStatus.SHORTLISTED).length,
    SELECTED: store.applications.filter(a => a.status === ApplicationStatus.SELECTED).length,
    CONFIRMED: store.applications.filter(a => a.status === ApplicationStatus.CONFIRMED).length,
    REJECTED: store.applications.filter(a => a.status === ApplicationStatus.REJECTED).length,
  };

  const totalInvitations = store.invitations.length;
  const acceptedInvitations = store.invitations.filter(i => i.status === 'ACCEPTED').length;
  const declinedInvitations = store.invitations.filter(i => i.status === 'DECLINED').length;
  const pendingInvitations = store.invitations.filter(i => i.status === 'PENDING').length;
  const invitationAcceptanceRate = totalInvitations > 0 ? Math.round((acceptedInvitations / totalInvitations) * 100) : 0;

  const totalParticipationRecords = store.participationHistory.length;

  // Category Distribution
  const categoryDistribution = store.categories.map(cat => {
    const skillIds = store.skills.filter(s => s.category_id === cat.category_id).map(s => s.skill_id);
    const studentCount = new Set(
      store.studentSkills.filter(ss => skillIds.includes(ss.skill_id)).map(ss => ss.student_id)
    ).size;
    const oppCount = store.opportunities.filter(o => o.category_id === cat.category_id).length;

    return {
      category_id: cat.category_id,
      category_name: cat.name,
      students_count: studentCount,
      opportunities_count: oppCount,
    };
  });

  // Top In-Demand Opportunities
  const topOpportunities = store.opportunities.map(opp => {
    const count = store.applications.filter(a => a.opportunity_id === opp.opportunity_id).length;
    return {
      opportunity_id: opp.opportunity_id,
      title: opp.title,
      applications_count: count,
      status: opp.status,
    };
  }).sort((a, b) => b.applications_count - a.applications_count).slice(0, 5);

  return {
    totalStudents,
    studentsWithSkills,
    talentRegistrationRate,
    totalOpportunities,
    activeOpportunities,
    closedOpportunities,
    archivedOpportunities,
    totalApplications,
    appStatusBreakdown,
    totalInvitations,
    acceptedInvitations,
    declinedInvitations,
    pendingInvitations,
    invitationAcceptanceRate,
    totalParticipationRecords,
    categoryDistribution,
    topOpportunities,
    generated_at: new Date().toISOString(),
  };
}
