import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export default function AuthSSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const userId = searchParams.get("userId");
    const expires = searchParams.get("expires");
    const sig = searchParams.get("sig");

    if (!userId || !expires || !sig) {
      setStatus("error");
      setMessage("Missing login parameters");
      return;
    }

    ssoLogin(userId, expires, sig);
  }, [searchParams]);

  async function ssoLogin(userId: string, expires: string, sig: string) {
    try {
      const qs = new URLSearchParams({ userId, expires, sig });
      const response = await fetch(`${API_BASE_URL}/api/auth/sso?${qs.toString()}`);

      if (!response.ok) {
        const error = await response.json();

        // Map server errors to friendlier messages
        if (response.status === 401 && error.error === "SSO link expired") {
          throw new Error(
            "This login link has expired. Please open the feedback link again.",
          );
        }
        if (response.status === 403) {
          throw new Error("Your account is banned");
        }
        if (response.status === 503) {
          throw new Error("SSO login is not available");
        }
        throw new Error(error.error || "Invalid login link");
      }

      const data = await response.json();

      // Clear admin token if exists (user login should logout admin)
      sessionStorage.removeItem("adminToken");

      // Save token to localStorage
      localStorage.setItem("auth_token", data.token);

      setStatus("success");
      setMessage(`Welcome${data.user.name ? `, ${data.user.name}` : ""}!`);
      setUserRole(data.user.role || "user");

      // Redirect after 2 seconds
      setTimeout(() => {
        // Redirect admin users to admin panel
        if (data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
        window.location.reload(); // Reload to update auth context
      }, 2000);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to login");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <h2 className="text-xl font-semibold mb-2">
                Signing you in...
              </h2>
              <p className="text-muted-foreground">Please wait a moment</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <h2 className="text-xl font-semibold mb-2">Success!</h2>
              <p className="text-muted-foreground mb-4">{message}</p>

              {userRole && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {userRole.toUpperCase()}
                  </span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">Redirecting you to the homepage...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold mb-2">Login Failed</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Button onClick={() => navigate("/")}>Go to Homepage</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
