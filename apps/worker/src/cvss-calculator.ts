// apps/worker/src/cvss-calculator.ts
// CVSS v3.1 Score Calculator for Enterprise Security Assessments

export interface CVSSMetrics {
    // Base Metrics
    attackVector: 'N' | 'A' | 'L' | 'P'; // Network, Adjacent, Local, Physical
    attackComplexity: 'L' | 'H'; // Low, High
    privilegesRequired: 'N' | 'L' | 'H'; // None, Low, High
    userInteraction: 'N' | 'R'; // None, Required
    scope: 'U' | 'C'; // Unchanged, Changed
    confidentialityImpact: 'N' | 'L' | 'H'; // None, Low, High
    integrityImpact: 'N' | 'L' | 'H';
    availabilityImpact: 'N' | 'L' | 'H';
}

const CVSS_VALUES = {
    attackVector: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    attackComplexity: { L: 0.77, H: 0.44 },
    privilegesRequired: {
        scopeUnchanged: { N: 0.85, L: 0.62, H: 0.27 },
        scopeChanged: { N: 0.85, L: 0.68, H: 0.5 }
    },
    userInteraction: { N: 0.85, R: 0.62 },
    confidentialityImpact: { N: 0, L: 0.22, H: 0.56 },
    integrityImpact: { N: 0, L: 0.22, H: 0.56 },
    availabilityImpact: { N: 0, L: 0.22, H: 0.56 }
};

export function calculateCVSS(metrics: CVSSMetrics): { score: number; severity: string; vector: string } {
    // Calculate Impact Sub-Score
    const isc = 1 - (
        (1 - CVSS_VALUES.confidentialityImpact[metrics.confidentialityImpact]) *
        (1 - CVSS_VALUES.integrityImpact[metrics.integrityImpact]) *
        (1 - CVSS_VALUES.availabilityImpact[metrics.availabilityImpact])
    );

    let impact: number;
    if (metrics.scope === 'U') {
        impact = 6.42 * isc;
    } else {
        impact = 7.52 * (isc - 0.029) - 3.25 * Math.pow(isc - 0.02, 15);
    }

    // Calculate Exploitability Sub-Score
    const prValue = metrics.scope === 'U'
        ? CVSS_VALUES.privilegesRequired.scopeUnchanged[metrics.privilegesRequired]
        : CVSS_VALUES.privilegesRequired.scopeChanged[metrics.privilegesRequired];

    const exploitability = 8.22 *
        CVSS_VALUES.attackVector[metrics.attackVector] *
        CVSS_VALUES.attackComplexity[metrics.attackComplexity] *
        prValue *
        CVSS_VALUES.userInteraction[metrics.userInteraction];

    // Calculate Base Score
    let baseScore: number;
    if (impact <= 0) {
        baseScore = 0;
    } else if (metrics.scope === 'U') {
        baseScore = Math.min(impact + exploitability, 10);
    } else {
        baseScore = Math.min(1.08 * (impact + exploitability), 10);
    }

    // Round up to 1 decimal
    baseScore = Math.ceil(baseScore * 10) / 10;

    // Determine severity
    let severity: string;
    if (baseScore === 0) severity = 'NONE';
    else if (baseScore < 4.0) severity = 'LOW';
    else if (baseScore < 7.0) severity = 'MEDIUM';
    else if (baseScore < 9.0) severity = 'HIGH';
    else severity = 'CRITICAL';

    // Generate vector string
    const vector = `CVSS:3.1/AV:${metrics.attackVector}/AC:${metrics.attackComplexity}/PR:${metrics.privilegesRequired}/UI:${metrics.userInteraction}/S:${metrics.scope}/C:${metrics.confidentialityImpact}/I:${metrics.integrityImpact}/A:${metrics.availabilityImpact}`;

    return { score: baseScore, severity, vector };
}

// Preset CVSS metrics for common vulnerability types
export const CVSS_PRESETS: Record<string, CVSSMetrics> = {
    SQL_INJECTION: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'N',
        scope: 'C',
        confidentialityImpact: 'H',
        integrityImpact: 'H',
        availabilityImpact: 'H'
    },
    XSS_STORED: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'R',
        scope: 'C',
        confidentialityImpact: 'L',
        integrityImpact: 'L',
        availabilityImpact: 'N'
    },
    XXE: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'N',
        scope: 'U',
        confidentialityImpact: 'H',
        integrityImpact: 'N',
        availabilityImpact: 'N'
    },
    SSRF: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'L',
        userInteraction: 'N',
        scope: 'C',
        confidentialityImpact: 'H',
        integrityImpact: 'L',
        availabilityImpact: 'L'
    },
    RCE: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'N',
        scope: 'C',
        confidentialityImpact: 'H',
        integrityImpact: 'H',
        availabilityImpact: 'H'
    },
    DESERIALIZATION: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'N',
        scope: 'U',
        confidentialityImpact: 'H',
        integrityImpact: 'H',
        availabilityImpact: 'H'
    },
    IDOR: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'L',
        userInteraction: 'N',
        scope: 'U',
        confidentialityImpact: 'H',
        integrityImpact: 'L',
        availabilityImpact: 'N'
    },
    SENSITIVE_DATA_EXPOSURE: {
        attackVector: 'N',
        attackComplexity: 'L',
        privilegesRequired: 'N',
        userInteraction: 'N',
        scope: 'U',
        confidentialityImpact: 'H',
        integrityImpact: 'N',
        availabilityImpact: 'N'
    }
};

export function getCVSSForVulnerability(vulnType: string): { score: number; severity: string; vector: string } {
    const metrics = CVSS_PRESETS[vulnType] || CVSS_PRESETS.SENSITIVE_DATA_EXPOSURE;
    return calculateCVSS(metrics);
}
