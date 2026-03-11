import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, CheckCircle2, Copy, FileText, ArrowRight } from "lucide-react";
import { Form, Question } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { DoodleBackground } from "../components/Doodles";
import { RatingInput } from "../components/RatingInput";

export default function CreateFormPage() {
  const location = useLocation();
  const [prompt, setPrompt] = useState(location.state?.prompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<Form | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const examplePrompts = [
    "Create a restaurant feedback survey",
    "Create an event registration form",
    "Create a job application form"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedForm(null);
    setPublishedUrl(null);
    try {
      const ai = new GoogleGenAI(process.env.GEMINI_API_KEY || "");
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Generate a survey form based on: "${prompt}". Return JSON with "title" and "questions" (array of {type, question, options, required}).` }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(result.response.text());
      setGeneratedForm({ id: "preview-" + Date.now(), ...data });
    } catch (error) {
      console.error(error);
      alert("Generation failed. Check your API key in Render.");
    } finally {
      setIsGenerating(false);
    }
  };

      const data = JSON.parse(result.response.text());

      setGeneratedForm({
        id: "preview-" + Date.now(),
        title: data.title,
        questions: data.questions,
      });
    } catch (error) {
      console.error("Error generating form:", error);
      alert("AI Generation failed. Check if your API Key is correct in Render.");
    } finally {
      setIsGenerating(false);
    }
  };

      const jsonStr = response.text?.trim() || "{}";
      const data = JSON.parse(jsonStr);

      // Add a temporary ID for preview
      setGeneratedForm({
        id: "preview-" + Date.now(),
        title: data.title,
        questions: data.questions,
      });
    } catch (error) {
      console.error("Error generating form:", error);
      alert("Failed to generate form. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedForm) return;
    
    setIsPublishing(true);
    
    try {
      const id = Math.random().toString(36).substring(2, 10);
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: generatedForm.title,
          questions: generatedForm.questions,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to publish form");
      }
      
      const url = `${window.location.origin}/form/${id}`;
      setPublishedUrl(url);
    } catch (error) {
      console.error("Error publishing form:", error);
      alert("Failed to publish form. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#111111] font-sans pb-24 selection:bg-black selection:text-white relative">
      <DoodleBackground />
      {/* Header */}
      <header className="relative z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="bg-black p-1.5 rounded-md text-white">
            <FileText size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">FormPilot AI</span>
        </div>
        <div className="flex items-center gap-3">
          {generatedForm && !publishedUrl && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              {isPublishing ? <Loader2 size={16} className="animate-spin" /> : "Publish"}
            </button>
          )}
          {publishedUrl && (
            <button
              onClick={() => navigate(`/dashboard/${publishedUrl.split("/").pop()}`)}
              className="px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              Dashboard
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-16">
        {/* Generator Section */}
        {!generatedForm && !isGenerating && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 mb-8 shadow-sm">
            <h1 className="text-3xl font-bold mb-3 text-black">Create a new form</h1>
            <p className="text-gray-500 mb-8">Describe what you want to ask, and AI will generate the fields.</p>
            
            <div className="relative mb-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Create a restaurant feedback survey..."
                className="w-full h-40 p-5 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none resize-none text-lg bg-[#fcfcfc] transition-colors"
              />
            </div>

            <div className="flex justify-start mb-10">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="px-6 py-3 bg-black text-white rounded-md font-medium text-md hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Form <ArrowRight size={18} />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 mb-3">Or try an example:</p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2 text-black">Generating your form...</h2>
            <p className="text-gray-500 mb-10">This usually takes a few seconds.</p>
            
            {/* Skeleton UI */}
            <div className="max-w-xl mx-auto space-y-8 text-left opacity-50">
              <div className="h-10 bg-gray-100 rounded-md w-3/4 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-5 bg-gray-100 rounded w-1/2 animate-pulse"></div>
                <div className="h-12 bg-gray-50 border border-gray-100 rounded-md w-full animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-5 bg-gray-100 rounded w-2/3 animate-pulse"></div>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-10 bg-gray-50 border border-gray-100 rounded-full animate-pulse"></div>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {publishedUrl && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-black mb-3">Form Published</h2>
            <p className="text-gray-500 mb-8">Your form is live and ready to collect responses.</p>
            
            <div className="flex items-center justify-center gap-2 max-w-lg mx-auto mb-8">
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md flex-1 text-left truncate text-gray-700 font-mono text-sm">
                {publishedUrl}
              </div>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center"
                title="Copy Link"
              >
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex justify-center gap-3">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-2.5 bg-white border border-gray-200 text-black rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Open Form
              </a>
              <button
                onClick={() => navigate(`/dashboard/${publishedUrl.split("/").pop()}`)}
                className="px-6 py-2.5 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Form Preview */}
        {generatedForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-10 pt-12 pb-6 border-b border-gray-100">
              <h2 className="text-4xl font-bold text-black">{generatedForm.title}</h2>
              {!publishedUrl && (
                <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Preview Mode
                </div>
              )}
            </div>
            <div className="p-10 space-y-10">
              {generatedForm.questions.map((q, index) => (
                <div key={index} className="space-y-4">
                  <label className="block text-xl font-medium text-black">
                    {q.question}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {q.type === "text" && (
                    <textarea
                      disabled
                      placeholder="Type your answer here..."
                      className="w-full h-24 p-0 border-0 border-b border-gray-200 focus:ring-0 bg-transparent resize-none text-gray-500 text-lg"
                    />
                  )}
                  
                  {q.type === "rating" && (
                    <RatingInput
                      value={0}
                      onChange={() => {}}
                      disabled
                    />
                  )}
                  
                  {q.type === "multiple_choice" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-gray-200 bg-gray-50">
                          <div className="w-4 h-4 rounded-full border border-gray-300 bg-white"></div>
                          <span className="text-gray-700">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-10 pb-10 pt-4 text-sm text-gray-500">
              * Required questions
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
