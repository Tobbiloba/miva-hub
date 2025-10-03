"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, TestTube, AlertCircle, CheckCircle } from "lucide-react";

interface SystemSettingsClientProps {
  category: string;
  currentSettings: any;
  children: React.ReactNode;
}

export function SystemSettingsClient({ category, currentSettings, children }: SystemSettingsClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Get form data from the children form elements
      const formData = new FormData();
      const form = document.querySelector(`form[data-category="${category}"]`) as HTMLFormElement;
      
      if (form) {
        new FormData(form).forEach((value, key) => {
          formData.append(key, value);
        });
      }

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [category]: Object.fromEntries(formData) }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settings Saved",
          description: `${category} settings have been updated successfully.`,
        });
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (category !== "email") return;
    
    setTestingEmail(true);
    try {
      const response = await fetch("/api/admin/settings?action=test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: currentSettings.fromEmail }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Email Test Successful",
          description: result.message,
        });
      } else {
        throw new Error(result.error || "Email test failed");
      }
    } catch (error) {
      toast({
        title: "Email Test Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {category === "email" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestEmail}
            disabled={testingEmail}
          >
            {testingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Test Email
              </>
            )}
          </Button>
        )}
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save {category} Settings
            </>
          )}
        </Button>
      </div>

      {/* Form content */}
      <form data-category={category}>
        {children}
      </form>
    </div>
  );
}