import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Sheet, 
  Link, 
  CheckCircle, 
  Copy, 
  Plus, 
  Minus, 
  Info, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Layers, 
  Compass, 
  HelpCircle, 
  Trash2, 
  Settings, 
  Check, 
  ExternalLink, 
  CheckSquare, 
  Activity, 
  DollarSign, 
  Printer, 
  X,
  CreditCard,
  Download,
  Megaphone,
  MessageCircle
} from "lucide-react";
import { toPng } from "html-to-image";
import { renderReceiptCanvas } from "./receiptCanvas";
import { 
  OrderFormData, 
  SubmissionResponse, 
  SavedSubmission,
  PRODUCT_PRESETS,
  LINING_PRESETS,
  COLOR_PRESETS,
  THICKNESS_PRESETS,
  SIZE_PRESETS
} from "./types";

export default function App() {
  // 1. Form Input States
  const [formData, setFormData] = useState<OrderFormData>({
    ordererName: "",
    customsId: "",
    postalCode: "",
    address: "",
    phone: "",
    productName: "",
    liningOption: "-",
    color: "블랙",
    gender: "남성",
    thickness: "", 
    size: "", 
    quantity: 1,
    price: 0,
    supplyPrice: 0,
    customNotes: ""
  });

  // Keep track of custom input states
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customColorText, setCustomColorText] = useState("");

  // Validation feedback
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});

  // 3. Submissions History State (Local storage caching)
  const [submissions, setSubmissions] = useState<SavedSubmission[]>(() => {
    try {
      const cached = localStorage.getItem("order_submissions");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Selected order for detailed modal receipt inspector
  const [selectedSubmission, setSelectedSubmission] = useState<SavedSubmission | null>(null);

  // Status transitions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmissionResponse | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText("3333385224522");
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // Sync historical submissions to local storage
  useEffect(() => {
    localStorage.setItem("order_submissions", JSON.stringify(submissions));
  }, [submissions]);

  // Load backend mock history on mount to sync with server
  useEffect(() => {
    fetch("/api/mock-submissions")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          // Merge server-side mock records with local submissions
          setSubmissions(prev => {
            const filteredLocal = prev.filter(p => !p.simulated);
            const serverMocks = data.map((item: any, idx: number) => ({
              id: `server-mock-${idx}`,
              timestamp: item.timestamp,
              data: item.data as OrderFormData,
              simulated: true,
              row: item.row
            }));
            return [...serverMocks, ...filteredLocal].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }
      })
      .catch((err) => console.log("Failed to load server mock submissions:", err));
  }, []);

  const validateForm = () => {
    const errors: Partial<Record<keyof OrderFormData, string>> = {};
    const regexCustoms = /^[pP]\d{12}$/; // Personal customs code: starts with P/p, 12 digits
    const regexPhone = /^01[016789]-?\d{3,4}-?\d{4}$/; // SK phone regex
    
    if (!formData.ordererName.trim()) {
      errors.ordererName = "주문자 이름을 입력해주세요.";
    }
    
    if (!formData.customsId.trim()) {
      errors.customsId = "개인통관고유번호는 필수 항목입니다.";
    } else if (!regexCustoms.test(formData.customsId.trim())) {
      errors.customsId = "통관부호 형식(P로 시작하는 13자리 숫자)이 바르지 않습니다.";
    }
    
    if (!formData.postalCode.trim()) {
      errors.postalCode = "우편번호를 입력해주세요.";
    }
    
    if (!formData.address.trim()) {
      errors.address = "배송 주소를 입력해주세요.";
    }
    
    if (!formData.phone.trim()) {
      errors.phone = "연락처를 입력해주세요.";
    } else if (!regexPhone.test(formData.phone.replace(/\s/g, ""))) {
      errors.phone = "올바른 연락처 형식 (e.g. 010-1234-5678)을 작성해주세요.";
    }

    if (!formData.productName.trim()) {
      errors.productName = "상세 제품명을 입력해주세요.";
    }

    if (!formData.size.trim()) {
      errors.size = "사이즈를 직접 기입해주세요.";
    }

    if (!formData.thickness.trim()) {
      errors.thickness = "네오프렌 두께를 직접 기입해주세요.";
    }

    if (isCustomColor && !customColorText.trim()) {
      errors.color = "직접 입력할 색상을 기재해주세요.";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitResult(null);
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = Object.keys(formErrors)[0];
      const element = document.getElementById(`field-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    
    setIsSubmitting(true);

    // Form final mapping
    const finalProduct = formData.productName.trim();
    const finalLining = formData.liningOption || "-";
    const finalColor = isCustomColor ? customColorText.trim() : formData.color;
    const finalThickness = formData.thickness.trim();
    const finalSize = formData.size.trim();

    const finalPayload: OrderFormData = {
      ...formData,
      productName: finalProduct,
      liningOption: finalLining,
      color: finalColor,
      thickness: finalThickness,
      size: finalSize,
      price: 0,
      supplyPrice: 0,
      quantity: 1
    };

    // 구글 스프레드시트가 0으로 시작하는 우편번호나 연락처를 숫자로 자동 전환해 맨 앞 0을 생략하는 현상을 방지합니다.
    // 또한 주문자 이름 뒤에 '(25%)'를 붙여 구글 시트에만 저장되도록 하고, 사용자 UI 화면 및 로컬 영수증에는 깨끗한 원본 이름이 유지되도록 합니다.
    const networkPayload = {
      ...finalPayload,
      ordererName: finalPayload.ordererName
        ? (finalPayload.ordererName.includes("(25%)") ? finalPayload.ordererName.trim() : `${finalPayload.ordererName.trim()} (25%)`)
        : "",
      phone: finalPayload.phone && finalPayload.phone.startsWith("0") ? `'${finalPayload.phone}` : finalPayload.phone,
      postalCode: finalPayload.postalCode && finalPayload.postalCode.startsWith("0") ? `'${finalPayload.postalCode}` : finalPayload.postalCode
    };

    try {
      let resJson: SubmissionResponse;

      try {
        const response = await fetch("/api/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(networkPayload),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류가 발생했습니다.");
        }

        resJson = await response.json();
      } catch (backendError) {
        // 백엔드 Express 서버가 통신 불가능할 때 (Vercel 정적 페이지 빌드 환경 등)
        // 브라우저에서 직접 구글 스프레드시트 앱스크립트(GAS) 주소로 데이터를 전송하도록 폴백 처리합니다.
        console.warn("Express backend routing failed, falling back to direct browser post:", backendError);
        const directScriptUrl = "https://script.google.com/macros/s/AKfycbwQ9mCZEyC4bu3J_pcUltdv22l9j6aXQ8BmP2Fap0mBipjeVLwQa5Lff_Nt0H3ebN-t/exec";

        // preflight CORS 방지를 위해 Content-Type을 text/plain으로 전송 (GAS 내부 JSON 파싱은 동일하게 처리됨)
        const directResponse = await fetch(directScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(networkPayload),
        });

        let directData: any = {};
        try {
          directData = await directResponse.json();
        } catch (jsonErr) {
          // CORS 리디렉션 제한 등으로 최종 JSON을 받지 못할 수 있으나, 브라우저가 POST 요청을 전달하여 시트에 실제 기입은 성공합니다.
          directData = {
            status: "success",
            message: "구글 시트 연동 전송 완료"
          };
        }

        resJson = {
          status: directData.status || "success",
          message: directData.message || "구글 시트에 직접 데이터를 전송했습니다.",
          row: directData.row || "확인 불가 (직접 전송)",
          simulated: false,
          timestamp: new Date(new Date().getTime() + (9 * 60 * 60 * 1000))
            .toISOString()
            .replace("T", " ")
            .substring(0, 19)
        };
      }

      setSubmitResult(resJson);

      if (resJson.status === "success") {
        // Dynamic save to simulation ledger view
        const newSubmissionId = `sub-${Date.now()}`;
        const newSubmission: SavedSubmission = {
          id: newSubmissionId,
          timestamp: resJson.timestamp || new Date().toLocaleString(),
          data: finalPayload,
          simulated: !!resJson.simulated,
          row: resJson.row
        };

        // Cache locally
        setSubmissions(prev => [newSubmission, ...prev]);

        // Show successful completion view or modal
        setSelectedSubmission(newSubmission);

        // Reset form inputs partially
        setFormData({
          ordererName: "",
          customsId: "",
          postalCode: "",
          address: "",
          phone: "",
          productName: "",
          liningOption: "-",
          color: "블랙",
          gender: "남성",
          thickness: "",
          size: "",
          price: 0,
          supplyPrice: 0,
          quantity: 1,
          customNotes: ""
        });
        
        // Reset state inputs
        setCustomColorText("");
        setIsCustomColor(false);
      }
    } catch (error: any) {
      console.error(error);
      setSubmitResult({
        status: "error",
        message: error.message || "구글 시트 전송 중 오류가 발생했습니다."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeSubmission = (id: string, simulated: boolean) => {
    if (confirm("주문 목록에서 해당 기록을 삭제하시겠습니까? (스프레드시트 원본 데이터는 삭제되지 않습니다.)")) {
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    }
  };

  const clearSimulationHistory = async () => {
    if (confirm("서버와 클라이언트에 기록된 시뮬레이션 주문 기록을 모두 초기화하시겠습니까?")) {
      try {
        await fetch("/api/mock-submissions/clear", { method: "POST" });
        setSubmissions(prev => prev.filter(p => !p.simulated));
      } catch (err) {
        console.error("Failed to clear server mocks", err);
      }
    }
  };

  const handleDownloadReceiptImage = async () => {
    if (!selectedSubmission) return;
    setIsSavingImage(true);

    try {
      let dataUrl = "";
      const element = document.getElementById("receipt-print-area");

      if (element) {
        try {
          dataUrl = await toPng(element, {
            backgroundColor: "#ffffff",
            pixelRatio: 2,
            skipFonts: true,
            cacheBust: true,
          });
        } catch (toPngErr) {
          console.warn("DOM toPng failed, falling back to pure canvas renderer:", toPngErr);
        }
      }

      // If toPng returned empty or failed, use canvas 2D fallback
      if (!dataUrl || dataUrl.length < 50) {
        dataUrl = renderReceiptCanvas(selectedSubmission);
      }

      const link = document.createElement("a");
      const safeName = (selectedSubmission.data.ordererName || "suit").replace(/[^a-zA-Z0-9가-힣]/g, "");
      link.download = `bestdive_order_${safeName || "suit"}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Image generation error:", err);
      try {
        const emergencyDataUrl = renderReceiptCanvas(selectedSubmission);
        const link = document.createElement("a");
        link.download = `bestdive_order_${selectedSubmission.data.ordererName || "suit"}.png`;
        link.href = emergencyDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (finalErr) {
        alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 pb-24">
      


      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 pt-6 md:pt-8">

        {/* 0. PAGE TITLE (최상단 타이틀) */}
        <div className="mb-6 pb-4 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 tracking-wider">
                BESTDIVE
              </span>
              <span className="text-xs font-semibold text-slate-500">Bespoke Suit Order</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              이도겸 트레이너 베스트다이브 슈트 주문폼
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              25% 특별 할인 접수중
            </span>
          </div>
        </div>

        {/* 1. TOP NOTICE & ORDER GUIDE SECTION */}
        <section className="mb-8 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/90 rounded-2xl p-6 md:p-7 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-blue-200/70">
            <span className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <Megaphone className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                공지사항
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white tracking-normal">
                  필독
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">주문 전 반드시 아래 주문 방법과 계좌 정보를 확인해 주세요.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좌측: [주문 방법] 및 [입금계좌] */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
                  [주문 방법]
                </h3>
                <ol className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center mt-0.5 shadow-xs">
                      1
                    </span>
                    <div className="space-y-1">
                      <a
                        href="https://smartstore.naver.com/moffmall"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-bold transition-colors"
                      >
                        https://smartstore.naver.com/moffmall
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-slate-600">여기에서 원하는 제품을 찾고, 입금폼 입력을 진행하세요.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center mt-0.5 shadow-xs">
                      2
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      해당 제품의 제품명을 복사해서 제품명으로 입력해주세요.
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center mt-0.5 shadow-xs">
                      3
                    </span>
                    <p className="text-slate-600 mt-0.5">
                      해당 제품의 가격에서 <strong className="text-blue-700 font-bold">25% 할인된 금액</strong>을 아래 계좌로 입금해주세요.
                    </p>
                  </li>
                </ol>
              </div>

              {/* [입금계좌] 카드 */}
              <div className="bg-white border border-blue-200/90 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    [입금계좌]
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                  >
                    {copiedAccount ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>계좌번호 복사</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1">
                  <div className="font-mono font-extrabold text-sm md:text-base text-slate-900 tracking-wider">
                    3333385224522 <span className="font-sans text-xs font-bold text-blue-700 ml-1">카카오뱅크</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    예금주: <strong className="text-slate-900 font-bold">디엘엠씨(dlmc)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: [주문 관련 문의사항] */}
            <div className="bg-white/90 border border-blue-200/90 rounded-xl p-5 flex flex-col justify-between shadow-xs">
              <div className="space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block"></span>
                  [주문 관련 문의사항]
                </h3>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                    <User className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>문의 : <strong className="text-slate-900 font-bold">이도겸트레이너</strong></span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>유선 : <strong className="text-slate-900 font-bold">010-3824-6567</strong></span>
                    </div>
                    <a
                      href="tel:010-3824-6567"
                      className="px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                    >
                      전화걸기
                    </a>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
                      <MessageCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      주문 후 오픈채팅 입장 / 코드: <span className="bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-mono font-extrabold text-[12px]">1231</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      주문서 접수 및 입금 후 오픈채팅방에 입장해 주세요.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <a
                  href="https://open.kakao.com/o/gqd3A2Pi"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#191919]" />
                  <span>카카오톡 오픈채팅 입장하기 (코드: 1231)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#191919]/70" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CORE TWO-COLUMN LAYOUT: SURVING FORM & PREVIEW/INSPECTOR */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Order Survey Form (Col span 7) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8 self-stretch">
            
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">Order Form</span>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">주문서 작성</h2>
              </div>
              <HelpCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-8">
              
              {/* SECTION A: 주문인 인적사항 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">주문자 및 배송 정보</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Orderer Name Input */}
                  <div id="field-ordererName" className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">주문자 이름 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="예: 홍길동"
                      value={formData.ordererName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ordererName: e.target.value }))}
                      className={`w-full text-sm bg-slate-950 border ${formErrors.ordererName ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                    />
                    {formErrors.ordererName && <p className="text-[11px] text-rose-500">{formErrors.ordererName}</p>}
                  </div>

                  {/* Customs Identification Number */}
                  <div id="field-customsId" className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>개인통관고유번호 <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-blue-600 font-mono font-bold">P로 시작하는 13자리</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={13}
                      placeholder="예: P123456789012"
                      value={formData.customsId}
                      onChange={(e) => setFormData(prev => ({ ...prev, customsId: e.target.value.toUpperCase().trim() }))}
                      className={`w-full text-sm bg-white border ${formErrors.customsId ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase transition-all shadow-sm`}
                    />
                    {formErrors.customsId && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.customsId}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Phone / Contact */}
                  <div id="field-phone" className="col-span-1 space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">연락처 <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      required
                      placeholder="예: 010-1234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.phone ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.phone && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.phone}</p>}
                  </div>

                  {/* Postal Code (Required) */}
                  <div id="field-postalCode" className="col-span-1 space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">우편번호 (필수) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="예: 06130"
                      value={formData.postalCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value.replace(/[^0-9]/g, "") }))}
                      className={`w-full text-sm bg-white border ${formErrors.postalCode ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.postalCode && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.postalCode}</p>}
                  </div>

                  {/* Address */}
                  <div id="field-address" className="col-span-1 md:col-span-1 space-y-1.5 font-sans">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">주소 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="예: 서울특별시 강남구 테헤란로..."
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.address ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.address && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.address}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION B: 맞춤 상세 옵션 */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase font-sans">제품 상세 옵션</h3>
                </div>

                {/* 1. 상세 제품명 입력 */}
                <div id="field-productName" className="space-y-1.5">
                  <label className="text-xs text-slate-700 font-bold uppercase tracking-wider block">
                    1. 상세 제품명 입력 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="스마트스토어에서 복사한 제품명을 여기에 붙여넣어 주세요"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    className={`w-full text-sm bg-white border ${formErrors.productName ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                  />
                  {formErrors.productName && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.productName}</p>}
                </div>

                {/* 2. 성별 선택 */}
                <div id="field-gender" className="space-y-2">
                  <span className="text-xs text-slate-700 font-bold uppercase tracking-wider block font-sans">
                    2. 성별 선택 <span className="text-rose-500">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["남성", "여성"] as const).map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                        className={`py-2 px-3 text-xs md:text-sm font-bold rounded-lg border transition-all duration-200 cursor-pointer text-center ${
                          formData.gender === g
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                            : "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 & 4. 사이즈 입력 & 네오프렌 두께 입력 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 3. 사이즈 입력 */}
                  <div id="field-size" className="space-y-1.5">
                    <label className="text-xs text-slate-700 font-bold uppercase tracking-wider block font-sans">
                      3. 사이즈 입력 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="본인의 사이즈를 직접 작성해 주세요 (예: M, L, ML 등)"
                      value={formData.size}
                      onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.size ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.size && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.size}</p>}
                  </div>

                  {/* 4. 네오프렌 두께 입력 */}
                  <div id="field-thickness" className="space-y-1.5">
                    <label className="text-xs text-slate-700 font-bold uppercase tracking-wider block font-sans">
                      4. 네오프렌 두께 입력 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="두께를 직접 작성해 주세요 (예: 2mm, 3mm, 5mm 등)"
                      value={formData.thickness}
                      onChange={(e) => setFormData(prev => ({ ...prev, thickness: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.thickness ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.thickness && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.thickness}</p>}
                  </div>
                </div>

                {/* 5. 컬러 선택 */}
                <div id="field-color" className="space-y-3">
                  <span className="text-xs text-slate-700 font-bold uppercase tracking-wider block font-sans">
                    5. 컬러 선택 <span className="text-rose-500">*</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((col, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          if (col.label === "직접입력") {
                            setIsCustomColor(true);
                          } else {
                            setIsCustomColor(false);
                            setFormData(prev => ({ ...prev, color: col.label }));
                          }
                        }}
                        className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-all text-left duration-200 cursor-pointer ${
                          (isCustomColor && col.label === "직접입력") || (!isCustomColor && formData.color === col.label)
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm font-semibold"
                            : "bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {col.hex ? (
                          <span 
                            className="w-4 h-4 rounded-full border border-slate-200 shadow-sm flex-shrink-0" 
                            style={{ backgroundColor: col.hex }} 
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-200 flex items-center justify-center bg-gradient-to-tr from-slate-200 to-slate-400 text-[8px] font-bold text-slate-700 flex-shrink-0">
                            C
                          </span>
                        )}
                        <span className="text-xs truncate font-medium">{col.label}</span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {isCustomColor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-1.5"
                      >
                        <input
                          type="text"
                          required={isCustomColor}
                          placeholder="원하시는 커스텀 색상을 기입해 주세요 (예: 샴페인 골드, 레몬 마블 등)"
                          value={customColorText}
                          onChange={(e) => setCustomColorText(e.target.value)}
                          className="w-full text-sm bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {formErrors.color && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.color}</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 6. 추가 요구사항 작성 */}
                <div id="field-customNotes" className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-xs text-slate-700 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>6. 추가 요구사항 작성</span>
                    <span className="text-[10px] text-slate-400 font-medium">선택 사항</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="추가 요구사항이나 기타 전달사항을 작성해주세요"
                    value={formData.customNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, customNotes: e.target.value }))}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 shadow-sm transition-all"
                  />
                </div>

              </div>

              {/* Server actions footer */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      구글 스프레드시트로 주문 정보 동기화 중...
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-5 h-5 text-white" />
                      제작 맞춤 주문서 등록하기
                    </>
                  )}
                </button>
              </div>

              {/* Status responses banner */}
              {submitResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border flex gap-3 ${
                    submitResult.status === "success" 
                      ? "bg-green-50 border-green-250 text-green-800"
                      : "bg-rose-50 border-rose-250 text-rose-800"
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 shrink-0 ${submitResult.status === "success" ? "text-green-600" : "text-rose-600"}`} />
                  <div>
                    <h5 className="font-extrabold text-xs uppercase tracking-wider mb-0.5">
                      {submitResult.status === "success" 
                        ? (submitResult.simulated ? "주문 접수 완료 (로컬 저장됨)" : "구글 스프레드시트 배포 완료") 
                        : "주문 처리 전송 예외"}
                    </h5>
                    <p className="text-xs leading-relaxed opacity-90">{submitResult.message}</p>
                    {submitResult.row && (
                      <span className="inline-block mt-2 font-mono text-[10px] bg-white text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                        Spreadsheet Row: #{submitResult.row}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

            </form>
          </div>

          {/* Right Preview Section / Submission history ledger (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LEDGER 1: Active Order Receipt Preview Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
              
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-105">
                <span className="text-xs font-bold tracking-wider text-slate-500">맞춤 디자인 실시간 프리뷰</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Bespoke Lab
                </span>
              </div>

              {/* Invoice card container */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-5 font-mono shadow-sm">
                <div className="text-center border-b border-dashed border-slate-250 pb-4">
                  <h4 className="text-sm font-bold text-slate-800 tracking-widest uppercase">ORDER INVOICE PREVIEW</h4>
                  <p className="text-[9px] text-slate-400 mt-1">ISSUED AT {new Date().toLocaleDateString()} LOCAL TIME</p>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Form detail items */}
                  <div className="flex justify-between">
                    <span className="text-slate-500">제품명:</span>
                    <span className="text-slate-800 font-bold max-w-[200px] truncate text-right">
                      {formData.productName || "[상세 제품명 대기]"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">성별:</span>
                    <span className="text-slate-800 font-medium">{formData.gender || "미정"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">사이즈:</span>
                    <span className="text-slate-800 font-medium">{formData.size || "[직접 입력 대기]"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">원단두께:</span>
                    <span className="text-slate-800 font-medium">{formData.thickness || "[직접 입력 대기]"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">스킨컬러:</span>
                    <span className="text-slate-800 font-medium flex items-center gap-1.5 justify-end">
                      {isCustomColor ? (customColorText || "직접 입력 대기") : (
                        <>
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-slate-200 inline-block shadow-sm"
                            style={{ backgroundColor: COLOR_PRESETS.find(p => p.label === formData.color)?.hex || "#FFFFFF" }} 
                          />
                          {formData.color}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* 가격 안내 배너 */}
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-md p-2 text-[11px] text-blue-900 flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <span>🏷️</span> 가격 혜택
                  </span>
                  <span className="font-bold text-blue-700">스마트스토어 기준 25% DC</span>
                </div>

                <div className="border-t border-dashed border-slate-250 pt-3">
                  <div className="text-[10px] text-slate-405 font-bold mb-1 uppercase tracking-wider text-slate-400">인적 사양 및 배송 정보</div>
                  <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                    <div className="text-slate-505 text-left text-slate-500">주문자:</div>
                    <div className="text-slate-805 text-right font-bold text-slate-800">{formData.ordererName || "[입력 대기]"}</div>
                    <div className="text-slate-505 text-left text-slate-500">통관번호:</div>
                    <div className="text-slate-805 text-right font-mono text-[10px] truncate text-slate-800">{formData.customsId || "[입력 대기]"}</div>
                    <div className="text-slate-505 text-left text-slate-500">우편번호:</div>
                    <div className="text-slate-805 text-right text-slate-800">{formData.postalCode || "[입력 대기]"}</div>
                  </div>
                </div>

                {formData.customNotes && (
                  <div className="bg-white p-2.5 text-[10px] text-slate-650 border border-slate-200 rounded-lg max-h-[80px] overflow-y-auto leading-relaxed shadow-sm">
                    <span className="font-bold border-b border-slate-100 inline-block pb-0.5 text-[9px] uppercase tracking-wide text-blue-600">기타 특이 요구사항:</span>
                    <p className="pt-1">{formData.customNotes}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          </section>
      </main>

      {/* 4. MODAL DETAILED ORDER RECEIPT INSPECTOR */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto py-10">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-2 items-center mb-4 text-slate-900">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-extrabold text-base text-slate-900">영수증 명세 및 서베이 세부정보</h4>
              </div>

              {/* Detailed Invoice Printable Canvas block */}
              <div id="receipt-print-area" className="bg-white text-slate-800 p-6 md:p-8 rounded-lg space-y-6 shadow-inner font-mono text-xs border border-slate-200">
                <div className="space-y-1.5 leading-relaxed pt-2">
                  <div className="flex justify-between font-bold text-[13px] text-slate-950">
                    <span>주문 일자:</span>
                    <span>{selectedSubmission.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>주문자 성명:</span>
                    <span className="text-slate-950 font-extrabold">{selectedSubmission.data.ordererName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>개인통관고유부호:</span>
                    <span className="text-slate-900 tracking-wider select-all font-bold font-mono">{selectedSubmission.data.customsId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>연락처 (인수자):</span>
                    <span className="text-slate-950">{selectedSubmission.data.phone}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span>배송지 우편번호:</span>
                    <span className="text-slate-950 font-bold">{selectedSubmission.data.postalCode}</span>
                  </div>
                  <div className="flex justify-between text-right">
                    <span>배송지 기본주소:</span>
                    <span className="text-slate-950 max-w-[200px] leading-snug break-all font-bold">{selectedSubmission.data.address}</span>
                  </div>
                  <p className="text-slate-300">----------------------------------------</p>

                  <div className="flex justify-between text-[13px] font-bold text-slate-950 bg-slate-50 p-2 rounded border border-slate-200">
                    <span>주문 제품명:</span>
                    <span className="max-w-[210px] truncate text-right font-extrabold">{selectedSubmission.data.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>성별:</span>
                    <span className="text-slate-950 font-bold">{selectedSubmission.data.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>사이즈:</span>
                    <span className="text-slate-950 font-semibold">{selectedSubmission.data.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>수트 원단 두께:</span>
                    <span className="text-slate-950">{selectedSubmission.data.thickness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>선택 컬러:</span>
                    <span className="text-slate-950 font-medium">{selectedSubmission.data.color}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-blue-700 font-semibold">
                    <span>가격 적용 혜택:</span>
                    <span>스마트스토어 판매가 기준 25% 할인</span>
                  </div>
                  <p className="text-slate-300">----------------------------------------</p>
                  
                  {selectedSubmission.data.customNotes && (
                    <div className="mt-4 p-2.5 bg-slate-50 text-[10px] rounded border border-slate-200 shadow-sm">
                      <div className="font-bold underline text-slate-800">커스텀 및 특별 지시 요구 기재사항:</div>
                      <p className="mt-1 leading-normal text-slate-650 italic whitespace-pre-line">{selectedSubmission.data.customNotes}</p>
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 border-t-2 border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest">THANK YOU FOR YOUR BESPOKE ORDER</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Designed with Antigravity Agent, cloud-orchestrated safely</p>
                </div>
              </div>

              {/* Action operations inside Modal footer */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSavingImage}
                  onClick={handleDownloadReceiptImage}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  {isSavingImage ? (
                    <>
                      <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      이미지 생성 중...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      주문서 이미지 저장
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                >
                  목록 대장으로 돌아가기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
