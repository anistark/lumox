// Use import instead of require
import { TextEncoder, TextDecoder } from 'util';

// Define a proper type for the global object
interface Global {
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
}

// Use proper type casting
(global as unknown as Global).TextEncoder = TextEncoder;
(global as unknown as Global).TextDecoder = TextDecoder;
