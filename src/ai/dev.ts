import { config } from 'dotenv';
config();

import '@/ai/flows/document-content-generator.ts';
import '@/ai/flows/field-mapper.ts';
import '@/ai/flows/awb-generator.ts';
import '@/ai/flows/pv-generator.ts';
import '@/ai/flows/sameday-test-awb-generator.ts';
