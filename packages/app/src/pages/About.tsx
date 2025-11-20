import React from "react";

const About: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="space-y-16">
        <header className="space-y-6">
          <h1 className="text-4xl font-light tracking-tight text-gray-900 sm:text-5xl">
            Bonding Curve Demo
          </h1>
          <p className="text-xl text-gray-500 font-light leading-relaxed max-w-2xl">
            An exploration of automated market making on Nervos CKB,
            demonstrating continuous liquidity and transparent pricing through
            mathematical precision.
          </p>
        </header>

        <div className="border-t border-gray-100 pt-16 space-y-16">
          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
              Concept
            </h2>
            <p className="text-gray-600 leading-loose text-lg font-light">
              This application showcases a <strong>Bonding Curve</strong>{" "}
              mechanism. Unlike traditional markets that rely on matching buyers
              and sellers, a bonding curve acts as an automated counterparty. It
              mints tokens when you buy and burns them when you sell, ensuring
              liquidity is always available.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-8">
              Mechanism
            </h2>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-3">
                <h3 className="text-gray-900 font-medium">Issuance</h3>
                <p className="text-gray-500 leading-relaxed font-light">
                  Sending CKB to the pool triggers the minting of new tokens.
                  The cost is determined mathematically, increasing as the
                  supply grows.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-gray-900 font-medium">Redemption</h3>
                <p className="text-gray-500 leading-relaxed font-light">
                  Returning tokens to the pool burns them. The pool releases CKB
                  back to you, with the price adjusting dynamically to the
                  reduced supply.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
              Formula
            </h2>
            <div className="bg-gray-50 rounded-lg p-8 font-mono text-sm text-gray-600 overflow-x-auto">
              Price = K · ln(Circulating Supply)
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-8 text-sm text-gray-500 font-light">
              <div>
                <span className="font-medium text-gray-900">K</span> — Curve
                steepness parameter
              </div>
              <div>
                <span className="font-medium text-gray-900">
                  Circulating Supply
                </span>{" "}
                — Total tokens purchased
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
              Pool Cell
            </h2>
            <div className="space-y-6">
              <p className="text-gray-600 leading-loose text-lg font-light">
                Each bonding curve pool is represented as a CKB cell with
                specific lock and UDT type scripts that enforce the bonding
                curve logic.
              </p>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-gray-900 font-medium mb-4">
                  Lock Script (Bonding Curve Lock)
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">
                      Code Hash:
                    </span>{" "}
                    The hash of the compiled CKB-JS-VM contract
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Hash Type:
                    </span>{" "}
                    "type"
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Args Structure:
                    </span>
                    <div className="mt-2 ml-4 space-y-1 font-mono text-xs bg-white p-3 rounded border">
                      <div>[0..2]: "0x0000" (prefix)</div>
                      <div>
                        [2..34]: BondingCurve JS Contract code hash (32 bytes)
                      </div>
                      <div>[34..35]: Hash type byte (1 byte)</div>
                      <div>
                        [35..39]: K parameter (4 bytes, u32 little-endian)
                      </div>
                      <div>
                        [39..55]: Total supply (16 bytes, u128 little-endian)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-gray-900 font-medium mb-4">
                  Type Script (xUDT)
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">
                      Code Hash:
                    </span>{" "}
                    The hash of the xUDT (extended UDT) contract
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Hash Type:
                    </span>{" "}
                    "type"
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Args:</span>{" "}
                    Hash of the pool creator's lock script (identifies token
                    ownership)
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-gray-900 font-medium mb-4">Cell Data</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">Content:</span>{" "}
                    Remaining token supply (16 bytes, u128 little-endian)
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Purpose:</span>{" "}
                    Tracks how many tokens are still available for purchase
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">Disclaimer</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="space-y-4 text-gray-700">
                <p className="leading-relaxed">
                  This project is for learning purposes only. 90% of the code is generated by AI, 10% is manually reviewed and debugged. If there are any errors or inappropriate parts, please understand and provide timely feedback.
                </p>
                <p className="leading-relaxed font-medium">
                  For technical demonstration and entertainment only, does not constitute any form of financial advice.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex gap-6">
              <a
                href="https://talk.nervos.org/t/a-simple-airdrop-demo/9682"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-gray-600 transition-colors border-b border-gray-200 hover:border-gray-400 pb-0.5"
              >
                Read discussion
              </a>
              <a
                href="https://github.com/RetricSu/simple-bonding-curve"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-gray-600 transition-colors border-b border-gray-200 hover:border-gray-400 pb-0.5"
              >
                View source
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
