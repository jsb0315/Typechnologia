# TypeScript 타입 & 인터페이스 매니저 - Architecture Draft

## 1. 목표 (Goals)
- 초급자: 시각적·직관적 접근으로 타입 시스템 학습 장벽 완화
- 중급 이상: 타입 구조 설계/리뷰 생산성 향상
- 서버리스(로컬 우선), 가벼운 러닝 커브, 빠른 시각적 피드백

## 2. 코어 도메인 (Core Domain Concepts)
| 개념 | 설명 |
|------|------|
| TypeBox | 인터페이스/타입/enum 등 타입 정의 박스 시각화 단위 |
| Relation | 상속(extends)/참조(reference) 등 박스 간 연결 메타 |
| SchemaGraph | TypeBox + Relation 전체 그래프 상태 |
| Snapshot | 특정 시점 그래프 직렬화 데이터(Undo/Versioning 대용) |
| ImportExport | JSON/TS AST 직렬화/역직렬화 기능 묶음 |

## 주요 기능
- 비주얼 스키마 빌더 (Visual Schema Builder)
 캔버스 기반 UI에서 자유롭게 타입/인터페이스 박스 생성 
 Drag & Drop으로 위치 이동, 관계선으로 타입 참조/상속 표현
 주석/메모 기능 제공 → 협업/학습 과정에서 맥락 유지
- 데이터 관리 (Data Management)
 로컬 스토리지 자동 저장: 간단한 사용 편의, 휘발성 데이터 허용
 Import/Export 지원: JSON/TS 파일 기반의 간편한 백업 & 공유

## 기술적 고려사항
Persistence: LocalStorage (서버리스 우선)
Data Model: TypeScript AST → JSON 변환 구조
Interoperability: TS Compiler API 활용하여 실제 타입 체크/검증 가능

## 프론트
1. 디자인 & UI 프레임워크
- Modern UI/UX: 미니멀 & 직관적 레이아웃, 다크모드 대응
- 모듈형 컴포넌트 구조: 재사용 가능 React 컴포넌트 기반 설계
- Canvas, Toolbar / Drawer, Context Menu, Floating Tutorial
2. 인터랙션 (Interactions)
🔹 커스텀 컨텍스트 메뉴 
컴포넌트별 메뉴 동적 활성화/비활성화
단축키 설명 툴팁 연동: 메뉴 Hover 시 관련 단축키 노출
우클릭 + 단축키 병행 지원: 숙련자 UX 최적화
🔹 단축키 튜토리얼 모듈 
Floating Onboarding: 튜토리얼 플로팅  collapse
컴포넌트 focus별 핵심 단축키 안내: N (새 타입 추가), Del (삭제), E (Export) 등
🔹 플로팅 드로어 (Floating Drawer)
Import/Export 통합 허브
JSON / TS 파일 업로드 & 다운로드
Drag & Drop Import 지원
세션 관리: 로컬 저장소 Snapshot 관리, Reset 버튼 제공
단축키 연계: Cmd + I → Import Drawer, Cmd + O → Export Drawer 등
3. 기술적 고려사항 (Tech Considerations)
React + Tailwind → 빠른 UI 구축, 모듈형 스타일 관리
Framer Motion → Floating 모듈/드로어 Transition 구현
Keyboard.js (또는 custom hook) → 단축키 매핑 관리
Accessibility: WAI-ARIA 준수, 키보드 중심 사용자도 사용 가능

## 3. 데이터 모델 (초안)
```ts
export interface TypeBox {
  id: string;
  name: string;
  kind: 'interface' | 'type' | 'enum';
  properties: Property[];
  extends?: string[]; // 다른 TypeBox.id 리스트
  comment?: string;
  position: { x: number; y: number };
  meta?: { locked?: boolean; color?: string };
}

export interface Property {
  name: string;
  type: string;
  optional?: boolean;
  comment?: string;
}

export interface Relation {
  id: string;
  from: string; // TypeBox.id
  to: string;   // TypeBox.id
  type: 'extends' | 'reference';
}

export interface SchemaGraph {
  boxes: Record<string, TypeBox>;
  relations: Record<string, Relation>;
  updatedAt: number;
  version: number;
}

export interface Snapshot {
  id: string;
  graph: SchemaGraph;
  createdAt: number;
  label?: string;
}
```

## 4. 상태 관리 전략
- 단순 프로토타입: React useState + custom hooks
- 확장 예상 시: Zustand 혹은 Jotai 고려 (다중 패널/성능 최적화)
- 그래프 빈번 변경 패턴: immutable copy 최소화 → 구조적 공유 또는 분리 (boxes/relations 구분)

## 5. 퍼시스턴스 (Persistence)
| 레벨 | 기술 | 내용 |
|------|------|------|
| 세션 자동 저장 | localStorage | `schema.graph` 키에 JSON 직렬화 (debounce 500ms) |
| 스냅샷 | localStorage | `schema.snapshots` 배열 (최대 N개, LRU 제거) |
| 수동 Export | 파일 다운로드 | JSON / .ts 코드 생성 (Blob) |
| Import | FileReader / Drag&Drop | JSON 검증 → graph merge 또는 replace |

## 6. Import/Export 파이프라인
```
TS Source (.ts) -> TS Compiler API (AST 파싱) -> Internal Graph (TypeBox[]) -> Canvas
Internal Graph -> Serializer -> JSON (.schema.json)
Internal Graph -> Codegen -> TS 선언 파일 (.d.ts or .ts)
```
- 1차 프로토타입: JSON 직렬화만 (AST 후순위)
- 2차: 간단한 interface/type alias 위주 AST 파서 추가

## 7. 컴포넌트 구조 (요약)
```
components/
  Canvas/
    Canvas.tsx          # 배경/그리드 + 박스/선 레이어
    TypeBox.tsx         # 단일 타입 카드(드래그 핸들 포함)
    RelationLine.tsx    # SVG 라인/커브
    ContextMenu.tsx     # 우클릭 컨텍스트 메뉴
  Toolbar/
    Toolbar.tsx         # 글로벌 액션/단축키 헌트
  Drawer/
    FloatingDrawer.tsx  # Import/Export + Snapshot 관리
  Tutorial/
    FloatingTutorial.tsx# 컨텍스트 단축키 안내
  Common/
    Modal.tsx
```

## 8. 주요 훅 (Hooks)
| 훅 | 역할 |
|----|------|
| useSchemaGraph | 그래프 CRUD + 저장/스냅샷 트리거 |
| useKeyboardShortcuts | 단축키 매핑/등록/해제 |
| useDragSelect | 박스 드래그, 영역 선택(멀티) |
| useLocalStorage | generic 직렬화/역직렬화 + debounce |
| useImportExport | JSON/TS 변환 로직 캡슐화 |

## 9. 단축키 맵 (초안)
| Key | Action | Note |
|-----|--------|------|
| N | 새 TypeBox 추가 | 중앙 또는 커서 위치 |
| Del | 선택 요소 삭제 | 확인 모달(옵션) |
| E | Export Drawer 열기 | 상태 sync |
| Cmd+I | Import Drawer 열기 |  |
| Cmd+O | Export Drawer 열기 |  |
| Cmd+S | 스냅샷 저장 | local only |
| Esc | 선택 해제 / 메뉴 닫기 | 우선순위 처리 |

## 10. 렌더링 & 성능 고려
- Canvas 레이어: 박스 DOM + SVG/Canvas 라인 분리
- 200~500 박스 목표: 리렌더 최소화를 위해 memo + shallow compare
- RelationLine: 배치 업데이트 (requestAnimationFrame)로 위치 계산
- Drag 시: 위치 state는 ref에 임시 저장 후 drag end 시 commit → reflow 최소화

## 11. 접근성 (A11y)
- 모든 버튼 role, aria-label 제공
- TypeBox 포커스 이동: Tab 순환 + 방향키(옵션) 네비게이션
- 단축키 안내: kbd 요소 + aria-describedby

## 12. 스타일 가이드
- Light-first / .dark opt-in
- Radius scale: 8, 12, 16 (주요 카드 16)
- Shadow scale: sm / default (token: --app-shadow)
- 색상: slate palette + semantic (info/primary/warn)

## 13. 에러 처리 전략
| 레이어 | 전략 |
|--------|------|
| Import JSON | schema version & 필수 필드 validate → toast/log |
| Drag | 좌표 NaN guard → 무시 |
| Snapshot 복원 | 존재하지 않는 relation cleanup |

## 14. 향후 확장 로드맵
1. 박스 레벨 타입 인퍼런스 미리보기 (TS Compiler API in-browser, worker)
2. 검색/팔레트(Command Palette)로 타입 빠른 점프
3. 협업 모드(WebSocket/CRDT)
4. 린트 규칙(금지 타입 패턴 강조)
5. AI 기반 타입 제안 (후순위)

## 15. 최소 실행(Proto) 스코프 정의
- 박스 추가/이동
- 단일 관계 생성 (extends)
- LocalStorage auto save
- JSON Export/Import (AST X)
- 스냅샷 생성/복원

---
