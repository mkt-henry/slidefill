import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Upload, Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Convert() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [converting, setConverting] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const { data: templates } = trpc.template.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const createConversion = trpc.conversion.create.useMutation();
  const { data: jobStatus, refetch: refetchJobStatus } = trpc.conversion.getStatus.useQuery(
    { jobId: jobId! },
    { enabled: jobId !== null, refetchInterval: 2000 }
  );

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

  if (!templates || templates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">SlideFill</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
                대시보드
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/templates")}>
                템플릿
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>템플릿이 필요합니다</CardTitle>
              <CardDescription>
                파일 변환을 시작하려면 먼저 템플릿을 등록해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/templates")} className="w-full">
                템플릿 등록하러 가기
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        toast.error("XLSX 파일만 업로드할 수 있습니다.");
        return;
      }
      setExcelFile(file);
      toast.success("엑셀 파일이 선택되었습니다.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles((prev) => [...prev, ...files]);
      toast.success(`${files.length}개의 이미지가 추가되었습니다.`);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (!selectedTemplateId) {
      toast.error("템플릿을 선택해주세요.");
      return;
    }

    if (!excelFile) {
      toast.error("엑셀 파일을 업로드해주세요.");
      return;
    }

    setConverting(true);
    toast.info("변환을 시작합니다...");

    try {
      // 1. 엑셀 파일 업로드
      const excelFormData = new FormData();
      excelFormData.append("file", excelFile);
      excelFormData.append("folder", "excel");

      const excelUploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: excelFormData,
      });

      if (!excelUploadResponse.ok) {
        throw new Error("엑셀 파일 업로드에 실패했습니다.");
      }

      const excelResult = await excelUploadResponse.json();

      // 2. 이미지 파일 업로드 (있는 경우)
      const imageMappings: Record<string, string> = {};
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFormData = new FormData();
        imageFormData.append("file", imageFiles[i]);
        imageFormData.append("folder", "images");

        const imageUploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: imageFormData,
        });

        if (imageUploadResponse.ok) {
          const imageResult = await imageUploadResponse.json();
          imageMappings[`{{image_${i + 1}}}`] = imageResult.key;
        }
      }

      // 3. 변환 작업 생성 (임시로 단어 수는 10으로 설정)
      const conversionResult = await createConversion.mutateAsync({
        templateId: selectedTemplateId,
        excelFileKey: excelResult.key,
        excelFileUrl: excelResult.url,
        wordPairCount: 10, // 실제로는 엑셀 파일을 파싱하여 계산해야 함
        imageMappings: Object.keys(imageMappings).length > 0 ? imageMappings : undefined,
      });

      setJobId(conversionResult.jobId);
      toast.success("변환 작업이 시작되었습니다. 잠시만 기다려주세요...");
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error(error instanceof Error ? error.message : "변환 중 오류가 발생했습니다.");
      setConverting(false);
    }
  };

  // 작업 상태 모니터링
  if (jobStatus) {
    if (jobStatus.status === "completed" && jobStatus.resultFileUrl && !resultUrl) {
      setResultUrl(jobStatus.resultFileUrl);
      setConverting(false);
      toast.success("변환이 완료되었습니다!");
    } else if (jobStatus.status === "failed") {
      setConverting(false);
      toast.error(`변환에 실패했습니다: ${jobStatus.errorMessage || "알 수 없는 오류"}`);
      setJobId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">SlideFill</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              대시보드
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/templates")}>
              템플릿
            </Button>
            <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">파일 변환</h2>
          <p className="text-muted-foreground">
            엑셀 데이터와 이미지를 업로드하여 PPT를 자동으로 생성하세요.
          </p>
        </div>

        {resultUrl ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>변환 완료!</CardTitle>
              <CardDescription>
                PPT 파일이 성공적으로 생성되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => window.open(resultUrl, "_blank")}
              >
                <Download className="mr-2 h-5 w-5" />
                PPT 다운로드
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setResultUrl(null);
                  setJobId(null);
                  setSelectedTemplateId(null);
                  setExcelFile(null);
                  setImageFiles([]);
                }}
              >
                새로운 변환 시작
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>1. 템플릿 선택</CardTitle>
                <CardDescription>
                  사용할 템플릿을 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedTemplateId?.toString() || ""}
                  onValueChange={(value) => setSelectedTemplateId(parseInt(value, 10))}
                  disabled={converting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="템플릿 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} ({template.slideCount}장)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. 엑셀 파일 업로드</CardTitle>
                <CardDescription>
                  'Start Word'와 'End Word' 열이 포함된 엑셀 파일을 업로드하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {excelFile ? (
                  <div className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      <span className="text-sm">{excelFile.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExcelFile(null)}
                      disabled={converting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      .xlsx 파일을 업로드하세요
                    </p>
                    <input
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      id="excel-upload"
                      onChange={handleExcelUpload}
                      disabled={converting}
                    />
                    <label htmlFor="excel-upload">
                      <Button asChild size="sm" disabled={converting}>
                        <span>파일 선택</span>
                      </Button>
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. 이미지 업로드 (선택)</CardTitle>
                <CardDescription>
                  템플릿에 삽입할 이미지를 업로드하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="border rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index)}
                        disabled={converting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      이미지 파일을 업로드하세요
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="image-upload"
                      onChange={handleImageUpload}
                      disabled={converting}
                    />
                    <label htmlFor="image-upload">
                      <Button asChild size="sm" variant="outline" disabled={converting}>
                        <span>파일 선택</span>
                      </Button>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. 변환 시작</CardTitle>
                <CardDescription>
                  모든 파일이 준비되면 변환을 시작하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={converting || !selectedTemplateId || !excelFile}
                  onClick={handleConvert}
                >
                  {converting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      변환 중...
                    </>
                  ) : (
                    "변환 시작"
                  )}
                </Button>
                
                {converting && (
                  <div className="text-sm text-muted-foreground text-center">
                    <p>변환이 진행 중입니다...</p>
                    <p className="mt-1">상태: {jobStatus?.status || "pending"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
