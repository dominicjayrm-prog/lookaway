import { useState } from "react";

const C = {
  bg: "#FAFAF7", accent: "#6C5CE7", accentL: "#A29BFE", accentD: "#4A3BBF",
  green: "#00B894", coral: "#FF6B6B", gold: "#D4A012", blue: "#0984E3",
  pink: "#FD79A8", teal: "#00CEC9",
  text: "#1A1A18", textM: "#636E72", textD: "#B2BEC3",
};

// ═══ INFO CARD COMPONENT ═══
const InfoCard = ({ icon, title, description, tip, accentColor = C.accent, action, actionLabel, onClose }) => (
  <div style={{
    position: "absolute", left: 16, right: 16, zIndex: 100,
    animation: "infoSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
  }}>
    {/* Card */}
    <div style={{
      background: "white", borderRadius: 20, overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    }}>
      {/* Coloured accent strip at top */}
      <div style={{ height: 3, background: accentColor }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 13, flexShrink: 0,
            background: `${accentColor}10`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.textM, lineHeight: 1.5 }}>{description}</div>
          </div>
          {/* Close button */}
          <div onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 13, flexShrink: 0,
            background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", marginTop: -2,
          }}>
            <span style={{ fontSize: 12, color: C.textD, lineHeight: 1 }}>✕</span>
          </div>
        </div>

        {/* Tip row (optional) */}
        {tip && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 6,
            padding: "8px 10px", borderRadius: 10,
            background: `${accentColor}06`,
            marginBottom: action ? 10 : 0,
          }}>
            <span style={{ fontSize: 11, flexShrink: 0 }}>💡</span>
            <span style={{ fontSize: 11, color: accentColor, fontWeight: 500, lineHeight: 1.4 }}>{tip}</span>
          </div>
        )}

        {/* Action button (optional) */}
        {action && (
          <div onClick={action} style={{
            padding: "10px 0", borderRadius: 11, textAlign: "center",
            background: accentColor, cursor: "pointer",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{actionLabel}</span>
          </div>
        )}
      </div>
    </div>

    {/* Arrow pointer (for positioning context) */}
    <div style={{
      width: 14, height: 14, background: "white",
      transform: "rotate(45deg)",
      position: "absolute", top: -6, left: 40,
      boxShadow: "-2px -2px 4px rgba(0,0,0,0.04)",
    }} />

    <style>{`
      @keyframes infoSlideUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);

// ═══ SHOWCASE — All info card examples ═══
export default function InfoCardShowcase() {
  const [activeCard, setActiveCard] = useState(null);

  const allCards = [
    {
      id: "lives",
      trigger: "Hearts / Lives",
      arrow: "left",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><path d="M20,34 C12,28 4,22 4,14 C4,8 9,4 14,4 C17,4 19,6 20,8 C21,6 23,4 26,4 C31,4 36,8 36,14 C36,22 28,28 20,34Z" fill={C.coral} /></svg>,
        title: "Lives",
        description: "You have 5 lives. Lose one each time you fail a level. Lives regenerate 1 every 30 minutes.",
        tip: "Get unlimited lives with Blanked+ — never wait to play again",
        accentColor: C.coral,
        action: () => {},
        actionLabel: "Learn about Blanked+",
      },
    },
    {
      id: "gems",
      trigger: "Gems Counter",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><polygon points="20,4 32,14 28,36 12,36 8,14" fill={C.accent} /></svg>,
        title: "Gems",
        description: "Gems buy power-ups and cosmetics from the shop. The more you play, the more you earn.",
        tip: "Earn 1-3 gems per level based on your star rating. Streaks give bonus gems!",
        accentColor: C.accent,
      },
    },
    {
      id: "streak",
      trigger: "Streak Counter",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><path d="M20,36 C14,36 10,30 10,24 C10,18 14,14 16,12 C16,16 18,18 20,16 C18,14 18,10 20,6 C22,10 26,14 28,18 C28,16 28,14 28,14 C30,16 32,20 32,24 C32,30 28,36 20,36Z" fill={C.coral} /><path d="M20,36 C16,36 14,32 14,28 C14,24 16,22 18,20 C18,24 20,26 22,24 C20,22 20,18 20,16 C22,20 24,22 26,26 C26,24 26,22 26,22 C28,24 30,26 30,28 C30,32 26,36 20,36Z" fill={C.gold} /></svg>,
        title: "Daily Streak",
        description: "Play at least one level every day to build your streak. The longer your streak, the more bonus rewards you unlock.",
        tip: "Buy Streak Shields in the shop to protect your streak if you miss a day",
        accentColor: C.coral,
      },
    },
    {
      id: "stars",
      trigger: "Star Rating (level complete)",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><polygon points="20,4 24,14 36,14 27,22 30,34 20,26 10,34 13,22 4,14 16,14" fill={C.gold} /></svg>,
        title: "Star Rating",
        description: "Every level awards 1-3 stars based on your score. Higher accuracy and speed means more stars.",
        tip: "90%+ = 3 stars · 70%+ = 2 stars · 50%+ = 1 star. Replay levels to improve!",
        accentColor: C.gold,
      },
    },
    {
      id: "powerup",
      trigger: "Power-up (when empty)",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="14" ry="10" fill="none" stroke={C.teal} strokeWidth="2.5" /><circle cx="20" cy="20" r="4" fill={C.teal} /></svg>,
        title: "Peek",
        description: "Peek lets you glance back at the scene for 2 seconds during the question phase. Perfect when you're almost sure but need a quick look.",
        tip: "You're out of Peeks! Buy more in the shop for 15 gems each",
        accentColor: C.teal,
        action: () => {},
        actionLabel: "Go to Shop",
      },
    },
    {
      id: "locked",
      trigger: "Locked World",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><rect x="10" y="20" width="20" height="16" rx="3" fill={C.textD} /><path d="M14,20 V14 C14,9 16.5,6 20,6 C23.5,6 26,9 26,14 V20" fill="none" stroke={C.textD} strokeWidth="3" /></svg>,
        title: "World Locked",
        description: "Complete all levels in World 2 to unlock this world. You're 18 levels away!",
        accentColor: C.textM,
      },
    },
    {
      id: "totalstars",
      trigger: "Total Stars (Journey)",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><polygon points="20,4 24,14 36,14 27,22 30,34 20,26 10,34 13,22 4,14 16,14" fill={C.gold} /></svg>,
        title: "Total Stars",
        description: "Stars collected across all game modes and worlds. Replay completed levels to earn more stars with higher scores.",
        accentColor: C.gold,
      },
    },
    {
      id: "blankedplus",
      trigger: "Blanked+ Banner",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><path d="M4 20Q20 6 36 20Q20 34 4 20Z" fill="none" stroke={C.accent} strokeWidth="2.5" /><circle cx="20" cy="20" r="5" fill={C.accent} /></svg>,
        title: "Blanked+",
        description: "Unlimited lives, 100 gems per month, a free daily power-up, and zero ads. Everything you need to train without limits.",
        tip: "Try 3 days free — cancel anytime before and pay nothing",
        accentColor: C.accent,
        action: () => {},
        actionLabel: "Start Free Trial",
      },
    },
    {
      id: "afford",
      trigger: "Can't Afford Item",
      card: {
        icon: <svg width="20" height="20" viewBox="0 0 40 40"><polygon points="20,4 32,14 28,36 12,36 8,14" fill={C.accent} opacity="0.4" /></svg>,
        title: "Not Enough Gems",
        description: "You need 35 more gems for this item. Keep playing to earn gems — every level completed gives 1-3 gems.",
        tip: "The Starter Pack gives you 200 gems for just £0.99",
        accentColor: C.accent,
        action: () => {},
        actionLabel: "View Starter Pack",
      },
    },
  ];

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      background: C.bg, minHeight: "100vh", padding: "40px 20px",
    }}>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, textAlign: "center", marginBottom: 4 }}>Info Cards</h1>
        <p style={{ fontSize: 13, color: C.textM, textAlign: "center", marginBottom: 24 }}>Tap any trigger to preview the info card</p>

        {/* Trigger buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 30 }}>
          {allCards.map(c => (
            <div key={c.id} onClick={() => setActiveCard(activeCard === c.id ? null : c.id)} style={{
              padding: "12px 16px", borderRadius: 14, cursor: "pointer",
              background: activeCard === c.id ? `${(c.card.accentColor || C.accent)}08` : "white",
              border: activeCard === c.id ? `1.5px solid ${(c.card.accentColor || C.accent)}25` : "1.5px solid rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `${(c.card.accentColor || C.accent)}10`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{c.card.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.trigger}</span>
              </div>
              <span style={{ fontSize: 11, color: C.textD }}>{activeCard === c.id ? "▲" : "▼"}</span>
            </div>
          ))}
        </div>

        {/* Active card preview */}
        {activeCard && (
          <div style={{ position: "relative", marginBottom: 20 }}>
            {(() => {
              const card = allCards.find(c => c.id === activeCard)?.card;
              if (!card) return null;
              return (
                <div style={{ animation: "infoSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }}>
                  <div style={{
                    background: "white", borderRadius: 20, overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ height: 3, background: card.accentColor || C.accent }} />
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                          background: `${card.accentColor || C.accent}10`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{card.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>{card.title}</div>
                          <div style={{ fontSize: 12, color: C.textM, lineHeight: 1.5 }}>{card.description}</div>
                        </div>
                        <div onClick={() => setActiveCard(null)} style={{
                          width: 26, height: 26, borderRadius: 13, flexShrink: 0,
                          background: "#F5F4F0", display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                        }}>
                          <span style={{ fontSize: 12, color: C.textD }}>✕</span>
                        </div>
                      </div>
                      {card.tip && (
                        <div style={{
                          display: "flex", alignItems: "flex-start", gap: 6,
                          padding: "8px 10px", borderRadius: 10,
                          background: `${card.accentColor || C.accent}06`,
                          marginBottom: card.action ? 10 : 0,
                        }}>
                          <span style={{ fontSize: 11, flexShrink: 0 }}>💡</span>
                          <span style={{ fontSize: 11, color: card.accentColor || C.accent, fontWeight: 500, lineHeight: 1.4 }}>{card.tip}</span>
                        </div>
                      )}
                      {card.action && (
                        <div style={{
                          padding: "10px 0", borderRadius: 11, textAlign: "center",
                          background: card.accentColor || C.accent, cursor: "pointer",
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{card.actionLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <style>{`
        @keyframes infoSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
