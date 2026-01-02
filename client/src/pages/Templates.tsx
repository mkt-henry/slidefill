import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Upload, Trash2, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Templates() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [uploading, setUploading] = useState(false);

  const { data: templates, refetch } = trpc.template.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteTemplate = trpc.template.delete.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 삭제되었습니다.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const createTemplate = trpc.template.create.useMutation({
    onSuccess: () => {
      toast.success("템플릿이 등록되었습니다.");
      refetch();
      setUploading(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setUploading(false);
    },
  });
  
  const getSlideCount = trpc.template.getSlideCount.useMutation();
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 파일 확장자 검증
    if (!file.name.endsWith(".pptx")) {
      toast.error("PPTX 파일만 업로드할 수 있습니다.");
      return;
    }
    
    setUploading(true);
    toast.info("템플릿을 업로드하는 중...");
    
    try {
      // 1. S3에 파일 업로드
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "templates");
      
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("파일 업로드에 실패했습니다.");
      }
      
      const uploadResult = await uploadResponse.json();
      
      // 2. 슬라이드 수 계산
      const slideCountResult = await getSlideCount.mutateAsync({
        fileKey: uploadResult.key,
      });
      
      // 3. 템플릿 등록
      await createTemplate.mutateAsync({
        name: file.name.replace(".pptx", ""),
        fileKey: uploadResult.key,
        fileUrl: uploadResult.url,
        slideCount: slideCountResult.slideCount,
      });
      
      // 파일 입력 초기화
      e.target.value = "";
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
      setUploading(false);
    }
  };

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

  const handleDelete = (id: number) => {
    if (confirm("정말로 이 템플릿을 삭제하시겠습니까?")) {
      deleteTemplate.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">SlideFill</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              대시보드
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/convert")}>
              변환하기
            </Button>
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">템플릿 관리</h2>
          <p className="text-muted-foreground">
            PPT 템플릿을 업로드하고 관리하세요.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>새 템플릿 업로드</CardTitle>
            <CardDescription>
              .pptx 파일을 업로드하여 템플릿으로 등록하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                PPTX 파일을 드래그하거나 클릭하여 업로드하세요
              </p>
              <input
                type="file"
                accept=".pptx"
                className="hidden"
                id="template-upload"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="template-upload">
                <Button asChild disabled={uploading}>
                  <span>{uploading ? "업로드 중..." : "파일 선택"}</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-xl font-semibold mb-4">등록된 템플릿</h3>
          {!templates || templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-muted-foreground">등록된 템플릿이 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  위에서 템플릿을 업로드하여 시작하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>
                      슬라이드 {template.slideCount}장
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation("/convert")}
                      >
                        사용하기
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
