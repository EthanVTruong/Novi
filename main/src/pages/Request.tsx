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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Request</h1>
        </div>

        {/* Amount Input - $ dynamically attached and centered */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center text-foreground">
            <span className="text-5xl font-light -mr-2">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="text-6xl font-light bg-transparent border-none outline-none text-center w-auto"
              style={{ width: `${Math.max(amount.length, 1) + 1}ch` }}
              autoFocus
            />
          </div>
        </div>

        {/* Description Input */}
        <div className="text-center">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's it for?"
            className="text-lg text-foreground bg-transparent border-none outline-none text-center w-full placeholder:text-muted-foreground"
          />
        </div>

        {/* Split Option */}
        {!showSplit && (
          <div className="pt-8">
            <Button
              variant="outline"
              onClick={() => setShowSplit(true)}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Split between multiple people
            </Button>
          </div>
        )}

        {/* Split Section */}
        {showSplit && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Split with ({participants.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSplit(false)}
                className="text-xs"
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
                placeholder="Name"
                className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground outline-none focus:border-primary"
              />
              <Button onClick={addParticipant} variant="default">
                Add
              </Button>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg"
                  >
                    <span className="text-foreground">{participant.name}</span>
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="text-sm text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Request Button */}
        <div className="pt-8">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handleRequest}
          >
            Request ${amount || "0"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Request;