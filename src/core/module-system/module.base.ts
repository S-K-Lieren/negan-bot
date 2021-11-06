import { Client, Guild, Message, Role } from 'discord.js';
import { DatabaseKeys } from '../database.keys';
import { DatabaseAdapter } from '../abstract-database-adapter';
import _ from 'lodash';
import { ModuleHub } from './module.hub';
require('dotenv').config();

/**
 * Allows the current message to be handled by the next module
 */
export type NextFunction = () => void;

/**
 * Basic interfaces for a single Command
 */
export interface Command {
    onlyMods?: boolean;
    handler: (msg: Message) => void;
}

/**
 * Commands map
 */
export interface Commands {
    [name: string]: Command;
}

/**
 * Interface containing the meta data
 * properties used to describe modules
 */
export interface ModuleMetaData {
    name: string;
    alwaysActivated: boolean;
}

/**
 * Module decorator.
 * Overrides a class' constructor to set meta data.
 * @param metaData 
 */
export function Module(metaData: ModuleMetaData) {
    return function _DecoratorName<T extends { new(...args: any[]): {} }>(constr: T) {
        return class extends constr {
            constructor(...args: any[]) {
                super(...args);
                (this as unknown as AbstractModule).metaData = metaData;
            }
        }
    }
}

/**
 * The abstract class that all new modules
 * should extend
 */
export abstract class AbstractModule {

    /**
     * Meta data describing the module
     */
    public metaData!: ModuleMetaData;

    /**
     * Command map
     */
    private commands: Commands | undefined;

    /**
     * Currently hardcoded value for the prefix
     */
    protected static readonly PREFIX: string = process.env.PREFIX ?? '_';

    constructor(protected client: Client, protected database: DatabaseAdapter, protected moduleHub: ModuleHub) { }


    //#region PUBLIC METHODS

    async _init(): Promise<void> {
        await this.init();
        this.commands = this.registerCommands();
    }

    /**
     * Method called by the module hub
     * @param msg 
     * @param next 
     */
    async _handle(msg: Message, next: NextFunction): Promise<void> {
        await this.preHandle(msg, next);
    }

    //#endregion

    //#region PROTECTED METHODS

    /**
     * Modules can implement the init() method for initialization.
     * init() is being called once the discord client is 'ready'
     */
    protected init(): void | Promise<void> { };

    /**
     * In case modules should react on users' messages,
     * they need to extend this method.
     * 
     * Don't forget to call nextFunction() in order to enable
     * message handling by following modules
     * @param _msg
     * @param nextFunction 
     */
    protected handle(_msg: Message, nextFunction: NextFunction): void {
        nextFunction();
    }

    /**
     * Helper method to find out if the current module is
     * activated for a given guildID
     * @param guildID 
     */
    protected async isModuleActivated(guildID: string): Promise<boolean> {
        const disabledModules: Array<string> = await this.moduleHub.getDisabledModules(guildID);
        return !_.includes(disabledModules, this.metaData.name);
    }

    /**
     * Helper method to get all cached guilds
     */
    protected async getAllGuilds(): Promise<Map<string, Guild>> {
        return this.client.guilds.cache;
    }

    /**
     * If a mod role has been set for a guild (using <prefix>set-mod-role)
     * @param guildID 
     * @see CoreModule.setModRole
     */
    protected async getModRoleOrOwnerID(guildID: string): Promise<string> {
        return this.database.read<string>(guildID, DatabaseKeys.ModRole)
            .then((modRoleID: string | undefined) => {
                if (!modRoleID) {
                    return this.client.guilds.cache.get(guildID)?.ownerId as string;
                }
                return modRoleID;
            });
    }

    /**
     * Method responsible for registering a modules'
     * commands.
     * 
     * Registering slash commands will happen in here.
     * @param commands 
     */
    protected abstract registerCommands(): Commands | undefined;

    //#endregion

    //#region PRIVATE METHODS

    /**
     * Small helper method to determine, whether
     * the current message holds a command for the
     * current module
     * @param msg 
     */
    private isCommand(msg: Message): boolean {
        // Does not start with prefix
        if (!msg.content.startsWith(AbstractModule.PREFIX) || msg.content.length <= AbstractModule.PREFIX.length) { return false; }

        // There are no commands in this handler
        if (!this.commands) { return false; }

        const firstWord: string = msg.content.split(" ")[0].substr(1);
        return !!(this.commands[firstWord]);
    }

    /**
     * This method is being called before handle().
     * Responsible for:
     * - checking whether the module is disabled for the guild the message comes from
     * - checking whether the message is a command for the current module
     * - doing permission checks
     * @param msg
     * @param next 
     * @returns 
     */
    private async preHandle(msg: Message, next: NextFunction): Promise<void> {

        // Currently, we don't support DMs
        if (!msg.guildId) return;

        const moduleDeactivated: boolean = !await this.isModuleActivated(msg.guildId);

        if (moduleDeactivated) {
            next();
            return;
        }

        if (this.isCommand(msg)) {

            const firstWord: string = msg.content.split(" ")[0].substr(1);
            const command: Command | undefined = this.commands ? this.commands[firstWord] : undefined;
            if (command) {

                if (command.onlyMods) {
                    // do the permission check

                    const modRoleOrOwnerID: string = await this.getModRoleOrOwnerID(msg.guildId);

                    const hasRole: boolean | undefined = msg.author.id === process.env.BOT_OWNER_ID
                        || msg.author.id === modRoleOrOwnerID
                        || msg.member?.roles.cache.some((role: Role) => role.id === modRoleOrOwnerID);
                    if (!hasRole) {
                        msg.reply(`Dieser Befehl steht nur Benutzern mit der Rolle <@&${modRoleOrOwnerID}> zur Verfügung.`);
                        return;
                    }
                }
                command.handler(msg);
                return;
            }
        }

        this.handle(msg, next);
    }

    //#endregion
}

