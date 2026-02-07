import { Link } from "react-router-dom";
import { AlertCircle, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MessageLimitBannerProps {
  user: {
    remainingMessages?: number;
    tier?: string;
    messageCount?: number;
    messageLimit?: number;
  } | null;
}

export function MessageLimitBanner({ user }: MessageLimitBannerProps) {
  if (user?.remainingMessages === undefined) return null;

  const remaining = user.remainingMessages;
  const messageCount = user.messageCount || 0;
  const messageLimit = user.messageLimit || 20;

  const borderClass = remaining === 0
    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
    : remaining <= 5
      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
      : "border-violet-500/30 bg-violet-50 dark:bg-violet-900/20";

  const icon = remaining === 0
    ? <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
    : remaining <= 5
      ? <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      : <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />;

  const progressClass = remaining === 0
    ? "bg-red-500"
    : remaining <= 5
      ? "bg-amber-500"
      : "bg-violet-500";

  return (
    <Card className={`border-2 ${borderClass}`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <p className="font-medium">
                {remaining === 0
                  ? "You've reached your message limit"
                  : `${remaining} messages remaining`}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.tier === "FREE" ? (
                  <>Free tier: {messageCount}/{messageLimit} messages used</>
                ) : (
                  <>{user?.tier} tier: {messageCount}/{messageLimit} messages used</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${progressClass}`}
                style={{ width: `${(messageCount / messageLimit) * 100}%` }}
              />
            </div>
            {remaining === 0 && (
              <Link to="/pricing">
                <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
