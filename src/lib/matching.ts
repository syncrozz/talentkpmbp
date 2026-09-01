import { 
  Opportunity, 
  Student, 
  SkillLevel, 
  MatchResult, 
  MatchedSkillDetail 
} from '../types.ts';

const LEVEL_WEIGHTS: Record<SkillLevel, number> = {
  [SkillLevel.BEGINNER]: 1,
  [SkillLevel.INTERMEDIATE]: 2,
  [SkillLevel.ADVANCED]: 3,
};

/**
 * Deterministic, Explainable Talent Matching Engine
 * Compares an Opportunity's requirements with a Student's registered skills.
 * 
 * Complies with SES 4.4:
 * - Deterministic (no random / hallucinated scores)
 * - Explainable (clear human-readable reasoning points)
 * - Reusable across ANY opportunity category
 */
export function calculateOpportunityMatch(
  opportunity: Opportunity,
  student: Student
): MatchResult {
  const studentSkills = student.skills || [];
  
  if (!studentSkills || studentSkills.length === 0) {
    return {
      score: 0,
      tier: 'NONE',
      matched_skills: [],
      reasons: ['Pelajar belum mendaftar sebarang kemahiran bakat.'],
      matched_items: [],
      partial_items: [],
      missing_items: ['Semua peranan / syarat bakat belum didaftarkan'],
    };
  }

  // 1. Compile required roles & skill requirements
  const requiredSkillNames = new Set<string>();
  const roleReqMap = new Map<string, { originalName: string; minLevel?: SkillLevel; isRequired?: boolean }>();

  if (opportunity.open_call_roles && Array.isArray(opportunity.open_call_roles)) {
    opportunity.open_call_roles.forEach(role => {
      const clean = role.trim().toLowerCase();
      requiredSkillNames.add(clean);
      roleReqMap.set(clean, { originalName: role.trim(), minLevel: SkillLevel.INTERMEDIATE, isRequired: true });
    });
  }

  if (opportunity.requirements && Array.isArray(opportunity.requirements)) {
    opportunity.requirements.forEach(req => {
      if (req.skill_name) {
        // May contain multiple separated by '/'
        const parts = req.skill_name.split(/[\/,]/).map(p => p.trim().toLowerCase());
        parts.forEach(p => {
          if (p) {
            requiredSkillNames.add(p);
            roleReqMap.set(p, {
              originalName: req.skill_name || p,
              minLevel: req.minimum_level || SkillLevel.INTERMEDIATE,
              isRequired: req.is_required,
            });
          }
        });
      }
    });
  }

  const matchedSkills: MatchedSkillDetail[] = [];
  const reasons: string[] = [];
  const matched_items: string[] = [];
  const partial_items: string[] = [];
  const matchedReqKeys = new Set<string>();
  let rawScore = 0;

  // 2. Iterate through student skills and evaluate matches
  for (const sSkill of studentSkills) {
    const sSkillName = sSkill.skill_name || '';
    if (!sSkillName) continue;
    const sNameLower = sSkillName.toLowerCase();
    
    // Check direct match or substring match with any required skill
    let matchedReqKey: string | null = null;
    for (const reqKey of requiredSkillNames) {
      if (sNameLower.includes(reqKey) || reqKey.includes(sNameLower)) {
        matchedReqKey = reqKey;
        matchedReqKeys.add(reqKey);
        break;
      }
    }

    // Category match check
    const isSameCategory = Boolean(
      sSkill.category_name &&
      opportunity.category_name &&
      sSkill.category_name.toLowerCase() === opportunity.category_name.toLowerCase()
    );

    if (matchedReqKey) {
      const reqConfig = roleReqMap.get(matchedReqKey);
      const minLevel = reqConfig?.minLevel || SkillLevel.INTERMEDIATE;
      const studentWeight = LEVEL_WEIGHTS[sSkill.skill_level] || 1;
      const reqWeight = LEVEL_WEIGHTS[minLevel] || 2;
      const levelMet = studentWeight >= reqWeight;

      matchedSkills.push({
        skill_name: sSkill.skill_name,
        student_level: sSkill.skill_level,
        required_level: minLevel,
        is_primary: Boolean(sSkill.is_primary),
        level_met: levelMet,
      });

      // Point scoring
      let skillPoints = 40;
      if (levelMet) {
        skillPoints += 15;
        if (studentWeight > reqWeight) {
          skillPoints += 10; // Exceeds minimum requirement bonus
        }
        matched_items.push(`${sSkill.skill_name} — Tahap ${sSkill.skill_level}`);
      } else {
        skillPoints -= 15; // Lower than requested level
        partial_items.push(`${sSkill.skill_name} (${sSkill.skill_level} berbanding Min ${minLevel})`);
      }

      if (sSkill.is_primary) {
        skillPoints += 20; // Primary talent bonus
        matched_items.push(`Bakat Utama (${sSkill.skill_name})`);
        reasons.push(`Bakat Utama (${sSkill.skill_name}) sepadan dengan peranan yang dicari.`);
      } else {
        reasons.push(`Kemahiran ${sSkill.skill_name} (${sSkill.skill_level}) sepadan dengan peranan.`);
      }

      if (sSkill.experience_duration) {
        skillPoints += 10;
        matched_items.push(`Pengalaman: "${sSkill.experience_duration}"`);
        reasons.push(`Mempunyai rekod pengalaman: "${sSkill.experience_duration}".`);
      }

      rawScore += skillPoints;
    } else if (isSameCategory) {
      // Related category background
      rawScore += 15;
      partial_items.push(`Latar belakang aktif dalam ${sSkill.category_name} (${sSkill.skill_name})`);
      reasons.push(`Mempunyai latar belakang aktif dalam kategori berkaitan (${sSkill.category_name}).`);
    }
  }

  // 3. Find missing requirements
  const missing_items: string[] = [];
  requiredSkillNames.forEach(reqKey => {
    if (!matchedReqKeys.has(reqKey)) {
      const cfg = roleReqMap.get(reqKey);
      if (cfg && cfg.isRequired) {
        missing_items.push(cfg.originalName);
      }
    }
  });

  if (matched_items.length === 0 && partial_items.length === 0) {
    if (missing_items.length === 0 && requiredSkillNames.size > 0) {
      requiredSkillNames.forEach(k => missing_items.push(roleReqMap.get(k)?.originalName || k));
    }
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Determine Tier
  let tier: MatchResult['tier'] = 'NONE';
  if (finalScore >= 80) {
    tier = 'EXCELLENT';
  } else if (finalScore >= 60) {
    tier = 'STRONG';
  } else if (finalScore >= 40) {
    tier = 'MODERATE';
  } else if (finalScore >= 20) {
    tier = 'POTENTIAL';
  }

  if (reasons.length === 0) {
    reasons.push('Tiada kemahiran yang sepadan secara langsung dengan peranan peluang ini.');
  }

  return {
    score: finalScore,
    tier,
    matched_skills: matchedSkills,
    reasons,
    matched_items,
    partial_items,
    missing_items: missing_items.length > 0 ? missing_items : ['Tiada keperluan mandatori yang tertinggal'],
  };
}
