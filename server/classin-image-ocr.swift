import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count == 2 else { exit(2) }
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: url), let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(3) }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.usesLanguageCorrection = true
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
let observations = (request.results ?? []).sorted {
  if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.015 { return $0.boundingBox.midY > $1.boundingBox.midY }
  return $0.boundingBox.minX < $1.boundingBox.minX
}
for observation in observations {
  if let text = observation.topCandidates(1).first?.string { print(text) }
}
