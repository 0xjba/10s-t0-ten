// api/compile.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as solc from 'solc';

interface SolcError {
    severity: 'error' | 'warning';
    message: string;
}

interface CompilationOutput {
    errors?: SolcError[];
    contracts: {
        [filename: string]: {
            [contractName: string]: {
                abi: any[];
                evm: {
                    bytecode: {
                        object: string;
                    };
                };
            };
        };
    };
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Received compilation request');
        const { sourceCode } = req.body;

        if (!sourceCode) {
            console.error('No source code provided');
            return res.status(400).json({ error: 'Source code is required' });
        }

        console.log('Compiling source code...');
        const input = {
            language: 'Solidity',
            sources: {
                'contract.sol': {
                    content: sourceCode
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                },
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        };

        const output = JSON.parse(solc.compile(JSON.stringify(input))) as CompilationOutput;
        console.log('Compilation output:', output);
        
        if (output.errors?.some((error: SolcError) => error.severity === 'error')) {
            const compilationError = output.errors.filter((e: SolcError) => e.severity === 'error')[0].message;
            console.error('Compilation error:', compilationError);
            return res.status(400).json({ error: compilationError });
        }

        const contractFile = Object.keys(output.contracts['contract.sol'])[0];
        if (!contractFile) {
            console.error('No contract found in compilation output');
            return res.status(500).json({ error: 'No contract found in compilation output' });
        }

        const contract = output.contracts['contract.sol'][contractFile];
        console.log('Contract compiled successfully');

        return res.status(200).json({
            abi: contract.abi,
            bytecode: '0x' + contract.evm.bytecode.object
        });
    } catch (error: unknown) {
        console.error('Compilation error:', error);
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Compilation failed'
        });
    }
}