# Scoring and Trust Model v2
Growth(개인 성장), Trust(대외 신뢰)의 산출 모델, 그리고 Issuer Alignment 점수에 대해 정의한다.

## 1. Growth Index (개인 성장 지표)
- **개념**: 개인이 달성한 코어 역량의 레벨을 기반으로 한 현재의 성장 수준.
- **산출 방식**: 개별 경험(Experience)에 연결된 `experience_competencies.level`의 평균값.
  - `growth_index = avg(level)`
- **UI 표기**: 경험 카드나 상세에서 "오늘 키운 역량: 분석력 L3"와 같이 작은 텍스트 배지로 표기. 개인 동기부여 목적으로만 활용.

## 2. Trust Score & Label (대외 신뢰도)
- **개념**: 작성된 경험 데이터가 얼마나 객관적인 근거를 가지고 있는지, 타인의 확인을 받았는지를 나타내는 점수 및 라벨.
- **Trust Score 가중치 (기본값)**
  - `evidence_items` (url 첨부) ≥ 1 : +30점
  - `impact_signal` (결과 신호) 존재 : +40점
  - `experience_competencies` (역량 체크) ≥ 1 : +20점
  - `external_reviews` (Peer 리뷰) ≥ 1 : +20점
  - `issuer_reviews` (발주처 리뷰) ≥ 1 : +40점
- **Trust Label 정책 (최종 배지 결정 우선순위 기준)**
  1. `issuer_reviews >= 1` -> **Issuer** 배지
  2. `external_reviews >= 1` -> **Peer** 배지
  3. (evidence + impact 점수 충족) -> **Evidence** 배지
  4. 그 외 -> **Self** 배지
- **UI 표기**: 경험의 가장 상단에 눈에 띄게 큰 배지로 표기하며, 리뷰어가 존재할 경우 Peer(동료/고객), Issuer(발주처) 등 구체적 Relationship을 함께 노출한다. MVP에서는 과대 표기(예: Verified)를 금지하고 오직 위 4개 라벨만 사용.

## 3. Issuer Alignment (발주처 정합성 - Project Mode)
- **개념**: 사용자의 역량 수준이 프로젝트 발주처가 기대하는 역량과 얼마나 부합하는가에 대한 지표.
- **산출 방식**:
  - 발주처 기대 역량: `project_expectations(competency_key, target_level, weight)`
  - 사용자 역량 레벨: `experience_competencies.level` (`self_level`)
  - 개별 역량 충족도 (`s_i`): `min(self_level / target_level, 1.0)`
  - **Alignment Score** = `Σ(weight_i * s_i) / Σ(weight_i) * 100 (%)`
- **UI 표기**: Trust Label이 **Issuer** 인 경우에 한하여 경험 상세의 별도 섹션에 "발주처 기대 역량 정합성 XX%" 노출.
- 충족한 역량과 미충족한 역량을 나누어 설명 가능하게 리스트로 보여준다.
