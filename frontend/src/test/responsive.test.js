import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, sep } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..');

function collectCssFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectCssFiles(fullPath));
    } else if (entry.endsWith('.css')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractWidthBreakpoints(css) {
  const matches = css.matchAll(/@media[^{]*\(\s*(?:min|max)-width:\s*(\d+)px\s*\)/g);
  return [...matches].map((match) => match[1]);
}

describe('반응형 브레이크포인트 규칙(FE-10, docs/9-plan.md)', () => {
  const allCssFiles = collectCssFiles(SRC_DIR);
  const adminCssFiles = allCssFiles.filter((file) => file.includes(`${sep}admin${sep}`));
  const nonAdminCssFiles = allCssFiles.filter((file) => !adminCssFiles.includes(file));

  it('관리자 외 CSS에는 768px 이외의 너비 브레이크포인트가 없다(단일 브레이크포인트 원칙)', () => {
    for (const file of nonAdminCssFiles) {
      const breakpoints = extractWidthBreakpoints(readFileSync(file, 'utf8'));
      const nonStandard = breakpoints.filter((bp) => bp !== '768');
      expect(nonStandard, `${file}에 768px 이외의 브레이크포인트: ${nonStandard}`).toEqual([]);
    }
  });

  it('EventListPage/EventDetailPage/AuthPage는 768px 브레이크포인트를 실제로 사용한다', () => {
    for (const name of ['EventListPage.css', 'EventDetailPage.css', 'AuthPage.css']) {
      const file = allCssFiles.find((f) => f.endsWith(sep + name));
      expect(file, `${name} 파일을 찾지 못함`).toBeTruthy();
      expect(extractWidthBreakpoints(readFileSync(file, 'utf8'))).toContain('768');
    }
  });

  it('관리자 화면 CSS에는 반응형(너비 브레이크포인트) 작업을 하지 않았다', () => {
    expect(adminCssFiles.length).toBeGreaterThan(0);
    for (const file of adminCssFiles) {
      expect(extractWidthBreakpoints(readFileSync(file, 'utf8')), `${file}에 브레이크포인트가 존재함`).toEqual([]);
    }
  });
});
