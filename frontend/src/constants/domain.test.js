import { describe, it, expect } from 'vitest';
import * as frontendEnums from './domain.js';
// eslint-disable-next-line import/no-relative-packages
import * as backendEnums from '../../../backend/src/domain/enums.js';

describe('constants/domain.js', () => {
  it('backend enums.js와 스펠링까지 동일하다', () => {
    expect(frontendEnums.TARGET_TYPE).toEqual(backendEnums.TARGET_TYPE);
    expect(frontendEnums.PARTICIPATION_TYPE).toEqual(backendEnums.PARTICIPATION_TYPE);
    expect(frontendEnums.EVENT_STATUS).toEqual(backendEnums.EVENT_STATUS);
    expect(frontendEnums.ENTRY_STATUS).toEqual(backendEnums.ENTRY_STATUS);
    expect(frontendEnums.USER_ROLE).toEqual(backendEnums.USER_ROLE);
  });
});
