import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Download } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h1 className="text-2xl font-bold text-primary">SlideFill</h1>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : isAuthenticated ? (
              <Button onClick={() => window.location.href = "/dashboard"}>대시보드</Button>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()}>로그인</Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            엑셀 데이터로 PPT를<br />자동으로 생성하세요
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            반복적인 파워포인트 작업을 자동화하여 시간을 절약하고,<br />
            더 중요한 일에 집중하세요.
          </p>
          <div className="flex gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Button size="lg" onClick={() => window.location.href = "/dashboard"}>
                  시작하기
                </Button>
                <Button size="lg" variant="outline" onClick={() => window.location.href = "/templates"}>
                  템플릿 관리
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
                  무료로 시작하기
                </Button>
                <Button size="lg" variant="outline">
                  더 알아보기
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">주요 기능</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="text-xl font-semibold mb-2">간편한 업로드</h4>
            <p className="text-muted-foreground">
              PPT 템플릿과 엑셀 파일을 드래그 앤 드롭으로 간편하게 업로드하세요.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-indigo-600" />
            </div>
            <h4 className="text-xl font-semibold mb-2">자동 변환</h4>
            <p className="text-muted-foreground">
              엑셀의 데이터를 PPT 템플릿에 자동으로 치환하여 완성된 문서를 생성합니다.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-purple-600" />
            </div>
            <h4 className="text-xl font-semibold mb-2">즉시 다운로드</h4>
            <p className="text-muted-foreground">
              변환이 완료되면 즉시 다운로드하여 바로 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">요금제</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-gray-200">
            <h4 className="text-2xl font-bold mb-2">무료</h4>
            <p className="text-3xl font-bold mb-6">₩0<span className="text-lg font-normal text-muted-foreground">/월</span></p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span>템플릿 1개</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span>슬라이드 5장 이하</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span>치환 단어 10개 이하</span>
              </li>
            </ul>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = isAuthenticated ? "/dashboard" : getLoginUrl()}
            >
              시작하기
            </Button>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-xl shadow-lg text-white transform scale-105">
            <div className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
              인기
            </div>
            <h4 className="text-2xl font-bold mb-2">월간 구독</h4>
            <p className="text-3xl font-bold mb-6">₩9,900<span className="text-lg font-normal opacity-80">/월</span></p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>무제한 템플릿</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>무제한 슬라이드</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span>무제한 치환 단어</span>
              </li>
            </ul>
            <Button 
              variant="secondary" 
              className="w-full bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => window.location.href = isAuthenticated ? "/dashboard" : getLoginUrl()}
            >
              구독하기
            </Button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-gray-200">
            <h4 className="text-2xl font-bold mb-2">평생 이용권</h4>
            <p className="text-3xl font-bold mb-6">₩99,000<span className="text-lg font-normal text-muted-foreground">/평생</span></p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span>무제한 템플릿</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span>무제한 슬라이드</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span>무제한 치환 단어</span>
              </li>
            </ul>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = isAuthenticated ? "/dashboard" : getLoginUrl()}
            >
              구매하기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2026 SlideFill. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
