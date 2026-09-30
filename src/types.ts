export interface OrderFormData {
  ordererName: string;          // 주문자 이름
  customsId: string;            // 개인통관고유번호
  postalCode: string;           // 우편번호 (필수)
  address: string;              // 주소
  phone: string;                // 연락처
  productName: string;          // 제품명
  liningOption: string;         // 내피옵션
  color: string;                // 색상
  gender: '남성' | '여성' | '공용' | ''; // 성별
  thickness: string;            // 두께
  size: string;                 // 사이즈
  quantity: number;             // 수량
  price: number;                // 정가
  supplyPrice: number;          // 공급가
  customNotes: string;          // 커스텀 및 요구사항 기재
}

export interface SubmissionResponse {
  status: 'success' | 'error';
  message: string;
  row?: number;
  timestamp?: string;
  simulated?: boolean;
}

export interface SavedSubmission {
  id: string;
  timestamp: string;
  data: OrderFormData;
  simulated: boolean;
  row?: number;
}

// 명세 기반 기본 한글 옵션 프레셋들
export const PRODUCT_PRESETS = [
  { name: "bespoke", label: "맞춤 슈트", price: 0, supplyPrice: 0 }
];

export const LINING_PRESETS = [
  "오픈셀",
  "클로즈셀"
];

export const COLOR_PRESETS = [
  { value: "Black", label: "블랙", hex: "#000000" },
  { value: "Dark Gray", label: "다크그레이", hex: "#4B5563" },
  { value: "Blue", label: "블루", hex: "#1D4ED8" },
  { value: "Champagne", label: "샴페인", hex: "#F3E5AB" },
  { value: "Green", label: "그린", hex: "#15803D" },
  { value: "Red", label: "레드", hex: "#B91C1C" },
  { value: "Purple", label: "보라", hex: "#6D28D9" },
  { value: "Silver", label: "실버", hex: "#CBD5E1" },
  { value: "Gold", label: "골드", hex: "#D97706" },
  { value: "Sky", label: "스카이", hex: "#38BDF8" },
  { value: "Pink", label: "핑크", hex: "#F472B6" },
  { value: "Direct Input", label: "직접입력", hex: "" }
];

export const THICKNESS_PRESETS = [
  "직접 입력"
];

export const SIZE_PRESETS = [
  "직접 입력"
];
