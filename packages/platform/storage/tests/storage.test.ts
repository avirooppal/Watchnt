
import { MemoryRepository } from '../src/MemoryRepository';
import { runStorageContractTests } from '@watchnt/testing';

runStorageContractTests(() => new MemoryRepository());
