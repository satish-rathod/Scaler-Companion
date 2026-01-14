import clsx from 'clsx';

const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="border-b border-notion-border mb-6">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              activeTab === tab.id
                ? 'border-notion-text text-notion-text'
                : 'border-transparent text-notion-dim hover:text-notion-text hover:border-notion-hover',
              'whitespace-nowrap pb-3 border-b-2 font-medium text-sm transition-colors'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
