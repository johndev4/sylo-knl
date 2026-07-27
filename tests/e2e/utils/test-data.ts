import fs from 'fs';
import path from 'path';

export interface TestData {
  testUserId: string;
  testUserEmail: string;
  testUserPassword: string;
  testUser2Id: string;
  testUser2Email: string;
  testUser2Password: string;
  testLibraryId: string;
  testLibraryId2: string;
  testLibraryName: string;
  testLibraryName2: string;
}

export function getTestData(): TestData {
  const dataPath = path.resolve(
    process.cwd(),
    'tests/e2e/.auth/test-data.json'
  );
  if (!fs.existsSync(dataPath)) {
    throw new Error('Test data file not found. Ensure global setup has run.');
  }
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(rawData) as TestData;
}
