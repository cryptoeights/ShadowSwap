import { SwapCard } from '@/components/swap';
import LimitOrdersPanel from '@/components/swap/LimitOrdersPanel';
import TransactionHistory from '@/components/swap/TransactionHistory';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          <span className="gradient-text">Confidential</span>{' '}
          <span className="text-[var(--text-primary)]">Batch Auction DEX</span>
        </h1>
        <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
          MEV-protected swaps with encrypted orders. Your trades are private until execution.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Swap Interface */}
        <div>
          <SwapCard />
        </div>

        {/* Right Column: Limit Orders & Transaction History */}
        <div className="space-y-6">
          <LimitOrdersPanel />
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
