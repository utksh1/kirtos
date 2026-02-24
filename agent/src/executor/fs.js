const fs = require('fs').promises;
const path = require('path');

class FSExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'file.list':
                return await this._list(params.path);
            case 'file.read':
                return await this._read(params.path);
            case 'file.write':
                return await this._write(params.path, params.content);
            default:
                throw new Error(`FSExecutor: Unsupported intent "${intent}"`);
        }
    }

    async _list(dirPath = '.') {
        try {
            const resolvedPath = path.resolve(process.cwd(), dirPath);
            const files = await fs.readdir(resolvedPath);
            const fileListStr = files.slice(0, 10).join(', ');
            const moreCount = files.length > 10 ? ` and ${files.length - 10} more` : '';
            return {
                path: resolvedPath,
                files: files,
                message: `I found ${files.length} files in ${path.basename(resolvedPath)}: ${fileListStr}${moreCount}`
            };
        } catch (err) {
            return { error: `Failed to list directory: ${err.message}` };
        }
    }

    async _read(filePath) {
        try {
            const resolvedPath = path.resolve(process.cwd(), filePath);
            const content = await fs.readFile(resolvedPath, 'utf8');
            return {
                path: resolvedPath,
                content: content.substring(0, 5000) // Truncate long files
            };
        } catch (err) {
            return { error: `Failed to read file: ${err.message}` };
        }
    }

    async _write(filePath, content) {
        try {
            const resolvedPath = path.resolve(process.cwd(), filePath);
            await fs.writeFile(resolvedPath, content, 'utf8');
            return {
                status: 'success',
                path: resolvedPath,
                message: `Successfully wrote to ${path.basename(resolvedPath)}`
            };
        } catch (err) {
            return { error: `Failed to write file: ${err.message}` };
        }
    }
}

module.exports = new FSExecutor();
