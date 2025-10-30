import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useWallet from "@/hooks/useWallet";

/**
 * Request Component - Split Bill Payment Creator
 *
 * This component allows users to create split bill payment requests.
 *
 * FLOW:
 * 1. User (owner) enters total amount and description
 * 2. User adds participants to split the bill with
 * 3. On submit, calculates per-share amount using safe cents math
 * 4. Builds transfer URL and copies it to clipboard (does NOT navigate)
 * 5. Shows the copied link with "Copy Again" and "Open Link" buttons
 *
 * BEHAVIOR CHANGE:
 * - The component NO LONGER navigates to /transfer automatically
 * - Instead, it copies the payment link to clipboard for sharing
 * - This allows the owner to share the link with participants via text/email/etc
 * - Owner can optionally open the link themselves using the "Open Link" button
 *
 * SAFE ROUNDING LOGIC:
 * - Convert total to cents to avoid floating point errors
 * - Calculate base share: Math.floor(totalCents / splitCount)
 * - Calculate remainder: totalCents % splitCount
 * - For single-link routing: use base share amount
 * - For individual links: first 'remainder' participants pay +$0.01
 *
 * SPLIT PARAMETERS IN GENERATED LINK:
 * - recipient: Owner's wallet (receives all split payments)
 * - amount: Per-share amount (calculated with cents math)
 * - label: Description of the split
 * - message: Additional context
 * - total: Original total amount
 * - splitCount: Number of participants (including owner)
 * - shareIndex: (optional) Which share (0-based) for individual links
 */

interface Participant {
  id: string;
  name: string;
}

const Request = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [showSplit, setShowSplit] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentName, setCurrentName] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

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

  const handleRequest = async () => {
    // Validate wallet connection
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    // Validate description
    if (!description.trim()) {
      toast.error("Please add what this is for");
      return;
    }

    // Get owner wallet address (recipient of split payments)
    const owner = publicKey;

    // Calculate per-share amount using safe cents math
    const total = parseFloat(amount);
    // Include owner as a participant (+1)
    const splitCount = participants.length + 1;

    // Convert to cents to avoid floating point errors
    const totalCents = Math.round(total * 100);
    const baseShareCents = Math.floor(totalCents / splitCount);
    const remainder = totalCents % splitCount;

    // For a simple single link, use the base share amount
    // (The first 'remainder' participants would pay 1 extra cent if generating individual links)
    const perShareAmount = (baseShareCents / 100).toFixed(2);

    console.log("=== SPLIT PAYMENT CALCULATION ===");
    console.log("Total:", total);
    console.log("Split count:", splitCount);
    console.log("Total cents:", totalCents);
    console.log("Base share cents:", baseShareCents);
    console.log("Remainder cents:", remainder);
    console.log("Per share amount:", perShareAmount);

    // Build transfer URL with split parameters
    // Create absolute URL so it can be shared anywhere
    const params = new URLSearchParams({
      recipient: owner, // Owner receives all split payments
      amount: perShareAmount, // Per-share amount
      label: description,
      message: `Split payment for ${description}`,
      total: total.toString(),
      splitCount: String(splitCount),
    });

    // Build absolute transfer link (not relative)
    const transferLink = `${window.location.origin}/transfer?${params.toString()}`;

    // Copy to clipboard instead of navigating
    // This allows the user to share the link with participants
    try {
      await navigator.clipboard.writeText(transferLink);
      toast.success("Split payment link copied to clipboard!");
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      console.warn("Clipboard API failed, using fallback:", err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = transferLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Split payment link copied to clipboard (fallback)!");
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
        toast.error("Failed to copy link. Please try again.");
        return;
      }
    }

    // Store the link so UI can display it (allows manual copy or opening)
    setCopiedLink(transferLink);

    console.log("Split payment link created:", transferLink);
    // IMPORTANT: We do NOT navigate to /transfer anymore
    // The link is copied to clipboard for the user to share with participants
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

        {/* Copied Link Display */}
        {copiedLink && (
          <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl backdrop-blur-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Payment Link Ready</div>
              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <span>✓</span>
                <span>Copied</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-3 text-xs font-mono text-foreground/70 break-all border border-border/30">
              {copiedLink}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-2xl"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(copiedLink);
                    toast.success("Link copied again!");
                  } catch (err) {
                    toast.error("Failed to copy");
                  }
                }}
              >
                Copy Again
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 rounded-2xl"
                onClick={() => {
                  window.open(copiedLink, '_blank');
                }}
              >
                Open Link
              </Button>
            </div>
          </div>
        )}

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