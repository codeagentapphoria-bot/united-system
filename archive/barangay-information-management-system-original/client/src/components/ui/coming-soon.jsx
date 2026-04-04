import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Clock, Sparkles } from "lucide-react";

const ComingSoon = ({
  title,
  description,
  icon: Icon = Construction,
  features = [],
  estimatedCompletion = "Q1 2024",
  variant = "default", // "default", "premium", "basic"
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "premium":
        return {
          card: "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10",
          badge: "bg-primary text-primary-foreground",
          icon: "text-primary",
        };
      case "basic":
        return {
          card: "border-muted bg-muted/30",
          badge: "bg-secondary text-secondary-foreground",
          icon: "text-muted-foreground",
        };
      default:
        return {
          card: "border-border bg-card",
          badge: "bg-blue-500 text-white",
          icon: "text-blue-500",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="flex justify-center">
            <div className={`p-4 sm:p-6 rounded-full bg-muted/50 ${styles.icon}`}>
              <Icon className="h-12 w-12 sm:h-16 sm:w-16" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-sm sm:text-base lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
            <Badge variant="outline" className="text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Coming Soon
            </Badge>
            <Badge className={`text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 ${styles.badge}`}>
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {estimatedCompletion}
            </Badge>
          </div>
        </div>

        {/* Features Card */}
        {features.length > 0 && (
          <Card className={styles.card}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                <Construction className="h-5 w-5 sm:h-6 sm:w-6" />
                What's Coming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{feature.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent mx-auto rounded-full"></div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Our team is working hard to bring you this amazing feature. Stay
            tuned for updates!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
