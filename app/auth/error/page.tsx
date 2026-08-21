import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
function ErrorContent() {
  return (
    <p className="text-sm text-muted-foreground">
      This link may be invalid or expired. Request a new link and try again.
    </p>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorContent />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
