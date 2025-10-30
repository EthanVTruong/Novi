import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Copy, ExternalLink, QrCode } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

interface ParticipantStatus {
  name: string;
  amount: number;
  status: "pending" | "paid" | "confirmed";
  txHash?: string;
}

export const SplitStatus = () => {
  const { splitId } = useParams();
  const [description] = useState("Dinner at Olive Garden");
  const [requestedBy] = useState("John Doe");
  const [participants, setParticipants] = useState<ParticipantStatus[]>([
    { name: "Alice", amount: 20, status: "confirmed", txHash: "5k7m..." },
    { name: "Bob", amount: 20, status: "paid" },
    { name: "Charlie", amount: 20, status: "pending" },
  ]);

  const totalAmount = participants.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = participants
    .filter((p) => p.status === "confirmed" || p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const progress = (paidAmount / totalAmount) * 100;

  const copyPaymentLink = () => {
    const link = `${window.location.origin}/split/${splitId}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied!");
  };

  const getStatusIcon = (status: ParticipantStatus["status"]) => {
    switch (status) {
      case "confirmed":
        return <Check className="w-4 h-4 text-success" />;
      case "paid":
        return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case "pending":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ParticipantStatus["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            Confirmed
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Pending
          </Badge>
        );
    }
  };

  // Simulate payment updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.status === "paid" ? { ...p, status: "confirmed", txHash: "5k7m..." } : p
        )
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {requestedBy[0]}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment from</p>
              <p className="font-semibold text-foreground">{requestedBy}</p>
            </div>
          </div>
        </div>

        {/* Receipt Card */}
        <Card className="p-6 bg-card border-border shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">For</p>
              <p className="text-xl font-semibold text-foreground">{description}</p>
            </div>
            
            <div className="flex justify-between items-start pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-foreground">
                  ${totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl font-semibold text-primary">
                  ${paidAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Payers */}
        <Card className="p-6 bg-card border-border shadow-sm space-y-4">
          <h2 className="font-semibold text-foreground">
            {participants.length > 1 ? "Payers" : "Payment Status"}
          </h2>
          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-primary transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                    {participant.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {participant.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        ${participant.amount.toFixed(2)} USDC
                      </span>
                      {participant.txHash && (
                        <a
                          href={`https://solscan.io/tx/${participant.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:opacity-80 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusIcon(participant.status)}
                  {getStatusBadge(participant.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={copyPaymentLink} className="gap-2">
            <Copy className="w-4 h-4" />
            Copy Link
          </Button>
          <Button variant="outline" className="gap-2">
            <QrCode className="w-4 h-4" />
            Show QR
          </Button>
        </div>

        {/* Payment Action */}
        {participants.some((p) => p.status === "pending") && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {participants.length > 1 ? "Ready to pay your share?" : "Ready to pay?"}
              </p>
              <Button variant="gradient" className="w-full">
                Pay ${participants.find(p => p.status === "pending")?.amount.toFixed(2) || totalAmount.toFixed(2)}
              </Button>
            </div>
          </Card>
        )}

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground">
          Payments are settled on Solana • Instant and low-cost
        </p>
      </div>
    </div>
  );
};
