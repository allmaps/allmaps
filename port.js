#!/usr/bin/env node

/*
 * Usage ./port.js tileserver
 *
 * Prints: 5504
 */

import ports from './ports.json' assert { type: 'json' }

const app = process.argv[2]
console.log(ports[app])
