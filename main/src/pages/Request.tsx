import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
}

const Request = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [showSplit, setShowSplit] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentName, setCurrentName] = useState<string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");
    if (value.length > 5) value = value.slice(0, 5); // cap at 5 digits
    setAmount(value);
  };

  const addParticipant = () => {
    if (currentName.trim()) {
      setParticipants([
        ...participants,
        { id: Date.now().toString(), name: currentName.trim() },
      ]);
      setCurrentName("");
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleRequest = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    if (!description.trim()) {
      toast.error("Please add what this is for");
      return;
    }

    toast.success("Payment request created!");

    const splitId = Math.random().toString(36).substring(7);
    navigate(`/split/${splitId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-2xl w-12 h-12 hover:bg-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Split Bill</h1>
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl backdrop-blur-sm space-y-8">
          {/* Amount Input */}
          <div className="text-center space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Total Amount</div>
            <div className="inline-flex items-center justify-center text-foreground">
              <span className="text-5xl font-light text-muted-foreground -mr-2">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="text-7xl font-light bg-transparent border-none outline-none text-center w-auto"
                style={{ width: `${Math.max(amount.length, 1) + 1}ch` }}
                autoFocus
              />
            </div>
            <div className="text-sm text-muted-foreground">USDC</div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50"></div>

          {/* Description Input */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's it for?"
              className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-2xl text-foreground text-center outline-none focus:border-primary/50 placeholder:text-muted-foreground transition-colors"
            />
          </div>

          {/* Split Option */}
          {!showSplit && (
            <Button
              variant="outline"
              onClick={() => setShowSplit(true)}
              className="w-full h-12 rounded-2xl border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Add people to split with
            </Button>
          )}

          {/* Split Section */}
          {showSplit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                  Participants ({participants.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSplit(false)}
                  className="text-xs h-8 px-3 rounded-xl"
                >
                  Cancel
                </Button>
              </div>

              {/* Add Participant */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                  placeholder="Enter name"
                  className="flex-1 px-4 py-3 bg-muted/30 border border-border/50 rounded-2xl text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground transition-colors"
                />
                <Button
                  onClick={addParticipant}
                  variant="default"
                  className="rounded-2xl px-6"
                >
                  Add
                </Button>
              </div>

              {/* Participants List */}
              {participants.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-2xl border border-border/30"
                    >
                      <span className="text-foreground font-medium">{participant.name}</span>
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1 rounded-xl hover:bg-destructive/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Split Amount Display */}
              {participants.length > 0 && amount && parseFloat(amount) > 0 && (
                <div className="bg-primary/10 rounded-2xl p-4 text-center border border-primary/20">
                  <div className="text-xs text-muted-foreground mb-1">Each person pays</div>
                  <div className="text-2xl font-bold text-foreground">
                    ${(parseFloat(amount) / (participants.length + 1)).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request Button */}
        <Button
          variant="default"
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
          onClick={handleRequest}
        >
          Create Split Request • ${amount || "0"}
        </Button>
      </div>
    </div>
  );
};

export default Request;