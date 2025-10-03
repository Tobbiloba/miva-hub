"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Key, Upload, CheckCircle } from "lucide-react";

interface ProfileClientProps {
  category: string;
  currentProfile: any;
  children: React.ReactNode;
}

export function ProfileClient({ category, currentProfile, children }: ProfileClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Get form data from the children form elements
      const form = document.querySelector(`form[data-category="${category}"]`) as HTMLFormElement;
      const formData = new FormData(form);
      
      // Convert FormData to object
      const profileData: any = {};
      formData.forEach((value, key) => {
        if (key.includes('checkbox') || key.includes('switch')) {
          profileData[key] = value === 'on';
        } else {
          profileData[key] = value;
        }
      });

      // Handle special cases for different categories
      if (category === "security" && profileData.newPassword) {
        return await handlePasswordChange(profileData);
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category,
          data: profileData 
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Profile Updated",
          description: `Your ${category} information has been updated successfully.`,
        });
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (passwordData: any) => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      throw new Error("All password fields are required");
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      throw new Error("New passwords do not match");
    }

    if (passwordData.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });
        
        // Clear password fields
        const form = document.querySelector(`form[data-category="${category}"]`) as HTMLFormElement;
        if (form) {
          form.reset();
        }
      } else {
        throw new Error(result.error || "Failed to change password");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, or GIF).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Photo Updated",
          description: "Your profile photo has been updated successfully.",
        });
        
        // Refresh the page to show the new photo
        window.location.reload();
      } else {
        throw new Error(result.error || "Failed to upload photo");
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (category === "security") {
      return isChangingPassword ? "Changing Password..." : "Change Password";
    }
    return isLoading ? "Saving..." : `Save ${category} Info`;
  };

  const getButtonIcon = () => {
    if (isLoading || isChangingPassword) {
      return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
    }
    if (category === "security") {
      return <Key className="mr-2 h-4 w-4" />;
    }
    return <Save className="mr-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {category === "personal" && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('photo-upload')?.click()}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </Button>
          </div>
        )}
        
        <Button 
          onClick={handleSave} 
          disabled={isLoading || isChangingPassword}
          variant={category === "security" ? "default" : "default"}
        >
          {getButtonIcon()}
          {getButtonText()}
        </Button>
      </div>

      {/* Form content */}
      <form data-category={category}>
        {children}
      </form>

      {/* Security specific help text */}
      {category === "security" && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Password Requirements:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Include both letters and numbers</li>
                <li>• Use a unique password for your account</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}