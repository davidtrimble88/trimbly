import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { ReviewRow } from "./types";

interface ProReviewsTabProps {
  reviews: ReviewRow[];
  reviewCount: number;
}

const ProReviewsTab = ({ reviews, reviewCount }: ProReviewsTabProps) => {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-4">Reviews ({reviewCount})</h2>
      {reviews.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Star className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1">No reviews yet</h3>
            <p className="text-sm text-muted-foreground">Complete jobs to start receiving reviews from homeowners.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProReviewsTab;
