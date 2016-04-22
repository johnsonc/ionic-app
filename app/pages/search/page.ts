'use strict';
import { Page, NavController } from 'ionic-angular';
import { Line } from '../../models/itinerary';
import { History } from '../../models/history';
import { MapPage } from '../map/page';
import { FavoritesDAO } from '../../dao/favorites';
import { HistoryDAO } from '../../dao/history';
import { LineManager } from '../../managers/line';
import { FavoriteButton } from '../../components/favorite-button/controller';
import { LineItem } from '../../components/line-item/controller';

@Page({
    templateUrl: 'build/pages/search/template.html',
    directives: [FavoriteButton, LineItem],
})
export class SearchPage {

    private nav: NavController;

    private items: Line[] = [];
    private itemsBkp: Line[] = [];
    private favorites: Line[] = [];
    private histories: History[] = [];

    private fdao: FavoritesDAO;
    private hdao: HistoryDAO;
    private manager: LineManager;

    private limit: number = 10;
    private skip: number = 0;
    public showSearchBox: boolean = false;

    public get Items(): Line[] {
        return this.items;
    }

    public get Histories(): History[] {
        return this.histories;
    }

    public isFavorite(line: Line): boolean {
        return this.favorites.some(fav => line.Line === fav.Line);
    }

    public get searchBox(): any {
        let element: any = document.getElementById('searchbox');
        if (element) element = element.getElementsByTagName('input');
        if (element) element = element.item(0);
        return (element) ? element : null;
    }

    public constructor(nav: NavController, manager: LineManager) {
        this.nav = nav;
        this.manager = manager;
        this.fdao = new FavoritesDAO();
        this.hdao = new HistoryDAO();
    }

    public onPageLoaded(): void {
        this.loadRecents();
        this.loadFavorites();
    }

    public onPageWillEnter(): void {
        document.getElementById('search-view').style.display = 'initial';
    }

    public onPageWillLeave(): void {
        document.getElementById('search-view').style.display = 'none';
    }

    public onClickOnStar(line: Line): void {
        if (this.isFavorite(line)) this.fdao.remove(line).then((response: boolean) => this.onUnstar(response, line));
        else this.fdao.save(line).then((response: boolean) => this.onStar(response, line));
    }

    private onStar(response: boolean, line: Line): void {
        if (response) this.favorites.push(line);
    }

    private onUnstar(response: boolean, line: Line): void {
        if (response) {
            let index: number = this.favorites.findIndex(fav => fav.Line === line.Line);
            this.favorites.splice(index, 1);
        }
    }

    public find(line: Line): void {
        let history: History = new History(line, new Date());
        this.hdao.save(history).then(saved => {
            if (saved) console.log(`Saved ${line.Line} to history.`);
            this.nav.push(MapPage, { line: line });
        });
    }

    public findText(): void {
        let query: string = this.searchBox.value.replace('  ', ' ').replace(' , ', ',').replace(', ', ',').replace(' ,', ',');
        let line: Line = new Line(query, '');
        let history: History = new History(line, new Date());
        this.hdao.save(history).then(saved => {
            if (saved) console.log(`Saved ${line.Line} to history.`);
            this.nav.push(MapPage, { query: query });
        });
    }

    public filter(event: any): void {
        let query: string = this.searchBox.value;
        if (query.length > 0) {
            if (this.itemsBkp.length === 0) this.itemsBkp = this.items;
            this.manager.getAll().then(lines => {
                this.items = lines.filter(
                    (value: Line): boolean =>
                        value.Line.toLowerCase().indexOf(query.toLowerCase()) > -1 ||
                        value.Description.toLowerCase().indexOf(query.toLowerCase()) > -1
                );
            });
        } else {
            this.items = this.itemsBkp;
            this.itemsBkp = [];
        }
    }

    public showSearchBar(): void {
        this.showSearchBox = true;
        setTimeout(() => this.searchBox.focus(), 1);
    }

    public hideSearchBar(): void {
        if (this.searchBox.value.length > 0) {
            this.searchBox.value = '';
            this.filter(null);
        }
        this.showSearchBox = false;
    }

    private loadRecents(): void {
        this.hdao.getLimited(2).then(histories => this.histories = histories);
    }

    private loadFavorites(): void {
        this.fdao.getAll().then((lines: Line[]) => {
            this.favorites = lines;
            this.loadLines();
        });
    }

    private loadLines(infiniteScroll?: any): void {
        this.manager.getSlice(this.limit, this.skip).then(lines => {
            this.items = this.items.concat(lines);
            this.skip += this.limit;
            if (infiniteScroll) infiniteScroll.complete();
        });
    }
}
