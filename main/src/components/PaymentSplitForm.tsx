import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Users, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  amount?: number;
}

export const PaymentSplitForm = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [showSplitOption, setShowSplitOption] = useState(false);

  const addParticipant = () => {
    setParticipants([
      ...participants,
      { id: Date.now().toString(), name: "" },
    ]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const updateParticipantName = (id: string, name: string) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const updateParticipantAmount = (id: string, amount: string) => {
    setParticipants(
      participants.map((p) =>
        p.id === id ? { ...p, amount: parseFloat(amount) || undefined } : p
      )
    );
  };

  const calculateSplit = () => {
    const total = parseFloat(totalAmount);
    if (splitType === "equal") {
      return (total / participants.length).toFixed(2);
    }
    return "0.00";
  };

  const handleCreatePayment = () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      toast.error("Please add a description");
      return;
    }

    if (participants.length > 0) {
      const hasEmptyNames = participants.some((p) => !p.name.trim());
      if (hasEmptyNames) {
        toast.error("Please enter names for all payers");
        return;
      }
    }

    // Generate mock payment ID
    const splitId = Math.random().toString(36).substring(7);
    
    toast.success("Payment request created!");
    navigate(`/split/${splitId}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary mb-3">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Request Payment
          </h1>
          <p className="text-muted-foreground">Quick and simple</p>
        </div>

        {/* Form Card */}
        <Card className="p-6 bg-card border-border shadow-sm space-y-6">
          {/* Description */}
          <div>
            <Input
              id="description"
              type="text"
              placeholder="What's this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-base h-12 bg-input border-border"
            />
          </div>

          {/* Total Amount */}
          <div>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="Amount (USDC)"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="text-2xl h-14 bg-input border-border"
            />
          </div>

          {/* Split Option Toggle */}
          {!showSplitOption && (
            <Button
              variant="outline"
              onClick={() => setShowSplitOption(true)}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Split with others
            </Button>
          )}

          {showSplitOption && (
            <>
              {/* Split Type Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={splitType === "equal" ? "default" : "outline"}
                  onClick={() => setSplitType("equal")}
                  className="flex-1"
                >
                  Equal Split
                </Button>
                <Button
                  variant={splitType === "custom" ? "default" : "outline"}
                  onClick={() => setSplitType("custom")}
                  className="flex-1"
                >
                  Custom Split
                </Button>
              </div>

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {participants.length === 0 ? "Add payers" : `Payers (${participants.length})`}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addParticipant}
                    className="text-primary"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {participants.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Add people to split this payment
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex gap-2">
                        <Input
                          placeholder="Name"
                          value={participant.name}
                          onChange={(e) =>
                            updateParticipantName(participant.id, e.target.value)
                          }
                          className="flex-1 bg-input border-border"
                        />
                        {splitType === "custom" ? (
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={participant.amount || ""}
                            onChange={(e) =>
                              updateParticipantAmount(participant.id, e.target.value)
                            }
                            className="w-24 bg-input border-border"
                            step="0.01"
                          />
                        ) : (
                          <div className="w-24 flex items-center justify-center bg-input border border-border rounded-lg text-sm text-muted-foreground">
                            ${calculateSplit()}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipant(participant.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Create Button */}
          <Button
            variant="gradient"
            className="w-full h-12 text-base font-semibold"
            onClick={handleCreatePayment}
          >
            Create Payment Request
          </Button>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Powered by Solana • Instant settlement
        </p>
      </div>
    </div>
  );
};
