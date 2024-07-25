import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import * as ffmpeg from "fluent-ffmpeg";
import { mkdir } from "fs/promises";
import { join } from "path";
import { finalListDir } from "src/context";
import { isAccessiblePathSync } from "src/helper";

@Processor("audio-processor")
export class AudioProcessor {
  private ffmpegPath: string;
  private logger = new Logger(AudioProcessor.name);

  constructor() {
    this.ffmpegPath = "/usr/bin/ffmpeg";
    ffmpeg.setFfmpegPath(this.ffmpegPath);
  }

  @Process({ name: "prepare", concurrency: 1 })
  async prepareAudioFile(
    job: Job<{
      tempDir: string;
      originalFilePath: string;
      outputFileName: string;
    }>
  ) {
    return new Promise<void>((resolve, reject) => {
      this.logger.verbose(`Processing job => ${job.name}`);
      console.log("Prepare job started for =>", job.data.originalFilePath);
      const { tempDir, originalFilePath, outputFileName } = job.data;
      const fileName = originalFilePath.split("/").pop();
      const outputFilePath = join(tempDir, `${outputFileName}.mp3`);
      const command = ffmpeg();
      command
        .input(originalFilePath)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioFilters("aresample=44100") // Assure le taux d'échantillonnage
        .audioChannels(2) // Assure 2 canaux (stéréo)
        .toFormat("mp3")
        .on("end", (success) => {
          this.logger.log(`Converted ${fileName}`);
          resolve(success);
        })
        .on("error", (err) => {
          console.error("Error:", err);
          reject(err);
        })
        .save(outputFilePath);
    });
  }

  @Process({ name: "merge", concurrency: 1 })
  async mergeAudioFiles(
    job: Job<{
      outputDir: string;
      outputFileName: string;
      files: string[];
    }>
  ) {
    return new Promise<void>(async (resolve, reject) => {
      const { outputDir, outputFileName, files } = job.data;
      this.logger.verbose(`Processing merging for => ${outputFileName}`);
      const command = ffmpeg();
      files.forEach((file) => command.input(file));
      console.log(files);

      const tempDir = join(finalListDir, "temp");
      if (!isAccessiblePathSync(tempDir)) await mkdir(tempDir);

      command
        .audioCodec("libmp3lame")
        .outputFormat("mp3")
        .on("error", (err, stdout, stderr) => {
          console.error("Error to merge", err, stderr);
          reject(err);
        })
        .on("end", (res) => {
          this.logger.log(`${outputFileName} audio merge completed`);
          resolve(res);
        })
        .mergeToFile(join(outputDir, outputFileName), tempDir);
    });
  }

  // This processor take an audio list in entry and call prepareAudioFile processor to
  // handle each file of the list
  async prepareList() {}
}
