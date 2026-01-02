import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { FileText, Zap, CreditCard } from "lucide-react";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: subscription } = trpc.subscription.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: templates } = trpc.template.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: conversions } = trpc.conversion.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>로그인이 필요합니다</CardTitle>
            <CardDescription>
              SlideFill 서비스를 이용하려면 로그인해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = getLoginUrl()} 
              className="w-full"
            >
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tier = subscription?.tier || "free";
  const tierLabel = tier === "free" ? "무료" : tier === "monthly" ? "월간 구독" : "평생 이용권";
  const templateCount = templates?.length || 0;
  const conversionCount = conversions?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">SlideFill</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              홈으로
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">대시보드</h2>
          <p className="text-muted-foreground">
            안녕하세요, {user?.name || "사용자"}님! 현재 {tierLabel} 플랜을 사용 중입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">등록된 템플릿</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templateCount}</div>
              <p className="text-xs text-muted-foreground">
                {tier === "free" ? "최대 1개" : "무제한"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">변환 작업</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionCount}</div>
              <p className="text-xs text-muted-foreground">
                총 변환 횟수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">구독 플랜</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tierLabel}</div>
              <p className="text-xs text-muted-foreground">
                {tier === "free" ? "업그레이드 가능" : "활성화됨"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>빠른 시작</CardTitle>
              <CardDescription>
                SlideFill을 시작하려면 아래 단계를 따라주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setLocation("/templates")} 
                className="w-full"
              >
                1. 템플릿 업로드하기
              </Button>
              <Button 
                onClick={() => setLocation("/convert")} 
                className="w-full"
                variant="outline"
              >
                2. 파일 변환하기
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>사용 제한</CardTitle>
              <CardDescription>
                현재 플랜의 제한 사항입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">템플릿 등록</span>
                <span className="text-sm font-medium">
                  {tier === "free" ? "1개" : "무제한"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">슬라이드 수</span>
                <span className="text-sm font-medium">
                  {tier === "free" ? "5장 이하" : "무제한"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">치환 단어 수</span>
                <span className="text-sm font-medium">
                  {tier === "free" ? "10개 이하" : "무제한"}
                </span>
              </div>
              {tier === "free" && (
                <Button className="w-full mt-4" variant="default">
                  유료 플랜으로 업그레이드
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
