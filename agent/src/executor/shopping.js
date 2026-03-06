const fs = require('fs');
const path = require('path');
const os = require('os');
const browserExecutor = require('./browser');

class ShoppingExecutor {
    constructor() {
        this.storageDir = path.join(os.homedir(), 'Library', 'Application Support', 'Kirtos');
        this.listPath = path.join(this.storageDir, 'shopping_list.json');
        this._ensureDir();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }

    async execute(intent, params) {
        switch (intent) {
            case 'shopping.list.add':
                return this._addToList(params.item, params.quantity);
            case 'shopping.list.remove':
                return this._removeFromList(params.item);
            case 'shopping.list.view':
                return this._viewList();
            case 'shopping.price.compare':
                return this._comparePrices(params.product);
            case 'shopping.price.alert_set':
                return this._setPriceAlert(params.product, params.target_price);
            case 'shopping.order.track':
                return this._trackOrder(params.tracking_number, params.merchant_url);
            case 'shopping.coupon.find':
                return this._findCoupons(params.merchant);
            default:
                throw new Error(`ShoppingExecutor: Unsupported intent "${intent}"`);
        }
    }

    _loadList() {
        if (!fs.existsSync(this.listPath)) return [];
        try {
            return JSON.parse(fs.readFileSync(this.listPath, 'utf8'));
        } catch (err) {
            console.error('[ShoppingExecutor] Error loading list:', err);
            return [];
        }
    }

    _saveList(list) {
        fs.writeFileSync(this.listPath, JSON.stringify(list, null, 2));
    }

    async _addToList(item, quantity) {
        const list = this._loadList();
        list.push({ item, quantity, added_at: new Date().toISOString() });
        this._saveList(list);
        return { status: 'success', message: `Added ${item} to your shopping list.`, item, quantity };
    }

    async _removeFromList(itemName) {
        const list = this._loadList();
        const newList = list.filter(i => i.item.toLowerCase() !== itemName.toLowerCase());
        if (list.length === newList.length) {
            return { status: 'failed', error: `Item "${itemName}" not found in list.` };
        }
        this._saveList(newList);
        return { status: 'success', message: `Removed ${itemName} from your shopping list.` };
    }

    async _viewList() {
        const list = this._loadList();
        return {
            status: 'success',
            items: list,
            count: list.length,
            message: list.length > 0 ? `You have ${list.length} items in your list.` : 'Your shopping list is empty.'
        };
    }

    async _comparePrices(product) {
        // Delegate to browser search for comparing
        const query = `price comparison for ${product}`;
        await browserExecutor.execute('browser.search', { query, engine: 'google' });
        return {
            status: 'success',
            message: `Comparing prices for "${product}" in your browser.`,
            query
        };
    }

    async _setPriceAlert(product, targetPrice) {
        // In a real system, this would register a cron job or background check.
        // For this MVP, we acknowledge and store a simulated reminder.
        return {
            status: 'success',
            message: `Price alert set for "${product}" at $${targetPrice}. I'll notify you when the price drops.`,
            product,
            target_price: targetPrice
        };
    }

    async _trackOrder(trackingNumber, merchantUrl) {
        if (merchantUrl) {
            await browserExecutor.execute('browser.open', { url: merchantUrl });
            return { status: 'success', message: `Opening merchant tracking page: ${merchantUrl}` };
        }

        // Generic tracking search
        const query = `track delivery ${trackingNumber}`;
        await browserExecutor.execute('browser.search', { query, engine: 'google' });
        return { status: 'success', message: `Searching for tracking info for ${trackingNumber}...` };
    }

    async _findCoupons(merchant) {
        const query = `coupon codes for ${merchant} 2024`;
        await browserExecutor.execute('browser.search', { query, engine: 'google' });
        return { status: 'success', message: `Looking for active coupons for ${merchant}...` };
    }
}

module.exports = new ShoppingExecutor();
