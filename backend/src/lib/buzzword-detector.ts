export class BuzzwordDetector {
  private buzzwords = [
    'disruptive',
    'revolutionary',
    'game-changer',
    'game changer',
    'paradigm shift',
    'synergy',
    'leverage',
    'ecosystem',
    'unicorn',
    'moonshot',
  ];

  private detectedBuzzwords: Map<string, number> = new Map();

  detect(text: string): string[] {
    const lowerText = text.toLowerCase();
    const detected: string[] = [];

    for (const buzzword of this.buzzwords) {
      if (lowerText.includes(buzzword)) {
        detected.push(buzzword);
        
        // Track count
        const count = this.detectedBuzzwords.get(buzzword) || 0;
        this.detectedBuzzwords.set(buzzword, count + 1);
      }
    }

    return detected;
  }

  shouldInterrupt(text: string): boolean {
    const detected = this.detect(text);
    return detected.length > 0;
  }

  getDetectedBuzzwords(): Map<string, number> {
    return new Map(this.detectedBuzzwords);
  }

  getSuggestion(buzzword: string): string {
    const suggestions: Record<string, string> = {
      'disruptive': 'innovative or differentiated',
      'revolutionary': 'significant improvement',
      'game-changer': 'competitive advantage',
      'game changer': 'competitive advantage',
      'paradigm shift': 'new approach',
      'synergy': 'collaboration or efficiency',
      'leverage': 'use or utilize',
      'ecosystem': 'platform or network',
      'unicorn': 'high-growth company',
      'moonshot': 'ambitious goal',
    };

    return suggestions[buzzword.toLowerCase()] || 'be more specific';
  }

  reset() {
    this.detectedBuzzwords.clear();
  }
}
