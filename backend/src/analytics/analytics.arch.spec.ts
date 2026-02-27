import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Analytics architecture', () => {
  it('does not use MongoDB modules/services in analytics layer', () => {
    const analyticsDir = __dirname;
    const files = readdirSync(analyticsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'))
      .map((entry) => join(analyticsDir, entry.name));

    const forbiddenPatterns = [
      "from '@nestjs/mongoose'",
      "from 'mongoose'",
      '../users/users.service',
      '../orders/orders.service',
      '../promocodes/promocodes.service',
    ];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toContain(pattern);
      }
    }
  });
});
