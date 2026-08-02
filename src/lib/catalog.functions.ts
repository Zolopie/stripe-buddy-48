import { createServerFn } from '@tanstack/react-start';
import { fetchServices } from './catalog.server';

export const getServices = createServerFn({ method: 'GET' }).handler(async () => {
  return fetchServices();
});