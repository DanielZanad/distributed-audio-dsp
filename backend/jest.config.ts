import { pathsToModuleNameMapper } from "ts-jest"
import { Config } from "jest"
import { readFileSync } from "fs"

const { compilerOptions } = JSON.parse(readFileSync("./tsconfig.json", { encoding: "utf-8" }))

const config: Config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
    }),
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};

export default config;
