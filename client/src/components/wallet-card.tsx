import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WalletCardProps {
  balance: number;
}

export default function WalletCard({ balance }: WalletCardProps) {
  const { toast } = useToast();

  const handleAddFunds = async () => {
    try {
      await apiRequest("PATCH", "/api/user/balance", {
        balance: balance + 100,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Funds added",
        description: "$100 has been added to your wallet",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add funds",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Wallet Balance</h3>
          <Wallet className="h-5 w-5 text-primary" />
        </div>

        <p className="text-3xl font-bold mb-6">${balance}</p>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            onClick={handleAddFunds}
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
          <Button className="flex-1" variant="outline" size="sm">
            <ArrowDownRight className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
