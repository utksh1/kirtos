/**
 * JailbreakDetector: Scans natural language inputs for known jailbreak patterns
 * and prompt injection techniques.
 */
class JailbreakDetector {
    constructor() {
        this.patterns = {
            dan_mode: [
                "dan", "do anything now", "jailbreak", "freedom mode",
                "unfiltered", "no filters", "no restrictions", "god mode"
            ],
            roleplay_bypass: [
                "act as", "pretend to be", "you are now", "character.ai",
                "in this fictional scenario", "for this roleplay"
            ],
            academic_framing: [
                "for my research", "research paper", "academic purposes", "educational context",
                "university project", "thesis on", "studying how to"
            ],
            hypothetical: [
                "hypothetical scenario", "imagine that", "imagine a", "what if",
                "theoretically speaking", "for the sake of argument"
            ],
            encoding_attempts: [
                "base64", "decode this", "rot13", "caesar cipher",
                "ascii codes", "hexadecimal"
            ],
            injection_direct: [
                "ignore all previous instructions", "system prompt is",
                "you are now in admin mode"
            ]
        };
    }

    /**
     * Analyzes a prompt and returns a risk score and detected techniques.
     * @param {string} prompt The user input text.
     * @returns {Object} { score, riskLevel, techniques }
     */
    analyze(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            return { score: 0, riskLevel: 'LOW', techniques: [] };
        }

        const promptLower = prompt.toLowerCase();
        const scores = {};
        let totalScore = 0;
        const detectedTechniques = [];

        for (const [technique, phrases] of Object.entries(this.patterns)) {
            let techScore = 0;
            for (const phrase of phrases) {
                if (promptLower.includes(phrase)) {
                    techScore++;
                }
            }
            if (techScore > 0) {
                scores[technique] = techScore;
                totalScore += techScore;
                detectedTechniques.push(technique);
            }
        }

        let riskLevel = 'LOW';
        if (totalScore > 2) riskLevel = 'HIGH';
        else if (totalScore > 0) riskLevel = 'MEDIUM';

        return {
            score: totalScore,
            riskLevel,
            techniques: detectedTechniques,
            breakdown: scores
        };
    }
}

module.exports = new JailbreakDetector();
