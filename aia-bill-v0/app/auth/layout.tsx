import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .auth-wrap {
          background: #f5f5f5;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          color: #1f2937;
          font-size: 14px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        .auth-wrap .card {
          background: #fff;
          border: 1px solid #d4d4d4;
          border-radius: 8px;
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 380px;
        }
        .auth-wrap .brand { text-align: center; margin-bottom: 2rem; }
        .auth-wrap .brand img { height: 36px; width: auto; display: inline-block; }
        .auth-wrap .brand-name {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #6b7280;
          margin-top: 10px;
        }
        .auth-wrap h1 {
          font-size: 18px;
          font-weight: 600;
          color: #0a0a0a;
          margin-bottom: 4px;
          text-align: center;
        }
        .auth-wrap .subtitle {
          font-size: 13px;
          color: #6b7280;
          text-align: center;
          margin-bottom: 1.75rem;
        }
        .auth-wrap .subtitle strong { color: #374151; font-weight: 500; }
        .auth-wrap label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        .auth-wrap .error-msg {
          font-size: 12px;
          color: #cf222e;
          margin-bottom: 10px;
        }
        .auth-wrap button[type="submit"] {
          width: 100%;
          height: 38px;
          background: rgb(49, 70, 175);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background .15s;
        }
        .auth-wrap button[type="submit"]:hover { background: rgb(39, 56, 140); }
      `}</style>
      <div className={`auth-wrap ${inter.className}`}>
        {children}
      </div>
    </>
  );
}
