/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Configuration } from "@atomist/automation-client";
import { whenPushSatisfies } from "@atomist/sdm";
import {
    ArtifactGoal, Goals,
    JustBuildGoal, SoftwareDeliveryMachine,
} from "@atomist/sdm";
import * as build from "@atomist/sdm/dsl/buildDsl";
import { MavenBuilder } from "@atomist/sdm/internal/delivery/build/local/maven/MavenBuilder";
import { createEphemeralProgressLog } from "@atomist/sdm/log/EphemeralProgressLog";
import { createSoftwareDeliveryMachine } from "@atomist/sdm/machine/machineFactory";
import {
    SoftwareDeliveryMachineOptions,
} from "@atomist/sdm/machine/SoftwareDeliveryMachineOptions";
import { IsMaven } from "@atomist/sdm/mapping/pushtest/jvm/jvmPushTests";
import * as fs from "fs";
import { addDemoEditors } from "../parts/demo/demoEditors";

/**
 * Assemble a machine that only builds and verifies Java artifacts.
 * @return {SoftwareDeliveryMachine}
 */
export function artifactVerifyingMachine(options: SoftwareDeliveryMachineOptions,
                                         configuration: Configuration): SoftwareDeliveryMachine {
    const sdm = createSoftwareDeliveryMachine({
            name: "Artifact verifying machine", options,
            configuration,
        }, whenPushSatisfies(IsMaven)
            .itMeans("Push to Maven repo")
            .setGoals(new Goals("Verify artifact", JustBuildGoal, ArtifactGoal)),
    );
    sdm.addBuildRules(
        build.when(IsMaven)
            .itMeans("build with Maven")
            .set(new MavenBuilder(options.artifactStore, createEphemeralProgressLog, options.projectLoader)))
        .addArtifactListeners(async ai => {
            // Could invoke a security scanning tool etc.
            const stat = fs.statSync(`${ai.deployableArtifact.cwd}/${ai.deployableArtifact.filename}`);
            if (stat.size > 1000) {
                return ai.addressChannels(`Artifact \`${ai.deployableArtifact.filename}\` is very big at ${stat.size} :weight_lifter:`);
            }
        });

    addDemoEditors(sdm);
    return sdm;
}
