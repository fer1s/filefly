import AppKit
import FinderSync

final class FinderSync: FIFinderSync {
    private let finderController = FIFinderSyncController.default()

    override init() {
        super.init()
        // The home folder covers Desktop, Documents, Downloads, and their subfolders for the pilot.
        finderController.directoryURLs = [URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)]
    }

    override func menu(for menuKind: FIMenuKind) -> NSMenu? {
        guard menuKind == .contextualMenuForItems, !selectedFolders().isEmpty else { return nil }

        let menu = NSMenu()
        let item = NSMenuItem(
            title: NSLocalizedString("openInSito", comment: "Finder action to open selected folders in Sito File Browser"),
            action: #selector(openSelectedFolders(_:)),
            keyEquivalent: ""
        )
        item.target = self
        menu.addItem(item)
        return menu
    }

    @objc private func openSelectedFolders(_ sender: NSMenuItem) {
        for folder in selectedFolders() {
            var components = URLComponents()
            components.scheme = "sito-file-browser"
            components.host = "open"
            components.queryItems = [URLQueryItem(name: "path", value: folder.path)]
            if let url = components.url {
                NSWorkspace.shared.open(url)
            }
        }
    }

    private func selectedFolders() -> [URL] {
        (finderController.selectedItemURLs() ?? []).filter { url in
            url.isFileURL && (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true
        }
    }
}
