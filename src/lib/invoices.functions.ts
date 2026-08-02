import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { proposalSchema, submitProposalRequest, type ProposalResult } from './invoices.server';

export const requestSecureProposal = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => proposalSchema.parse(data))
  .handler(async ({ data }): Promise<ProposalResult> => {
    const request = getRequest();
    return submitProposalRequest(data, request.headers);
  });