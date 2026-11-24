// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { Scenario } from '../types';
import { regulatory } from './regulatory';
import { pricing } from './pricing';
import { reputation } from './reputation';
import { duediligence } from './duediligence';
import { traveler } from './traveler';
import { contracts } from './contracts';

export const SCENARIOS: Scenario[] = [regulatory, pricing, reputation, duediligence, traveler, contracts];

export const scenarioById = (id: string | null | undefined): Scenario | undefined => SCENARIOS.find((s) => s.id === id);
