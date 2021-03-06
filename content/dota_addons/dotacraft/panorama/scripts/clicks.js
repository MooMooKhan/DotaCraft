"use strict";

// Handle Right Button events
function OnRightButtonPressed()
{
	$.Msg("OnRightButtonPressed")

	var iPlayerID = Players.GetLocalPlayer();
	var mainSelected = Players.GetLocalPlayerPortraitUnit(); 
	var mainSelectedName = Entities.GetUnitName( mainSelected )
	var cursor = GameUI.GetCursorPosition();
	var mouseEntities = GameUI.FindScreenEntities( cursor );
	mouseEntities = mouseEntities.filter( function(e) { return e.entityIndex != mainSelected; } )
	
	var pressedShift = GameUI.IsShiftDown();

	// Builder Right Click
	if ( IsBuilder( mainSelected ) )
	{
		// Cancel BH
		SendCancelCommand();

		// If it's mousing over entities
		if (mouseEntities.length > 0)
		{
			for ( var e of mouseEntities )
			{
				var entityName = Entities.GetUnitName(e.entityIndex)
				// Gold mine rightclick
				if (entityName == "gold_mine"){
					$.Msg("Player "+iPlayerID+" Clicked on a gold mine")
					GameEvents.SendCustomGameEventToServer( "gold_gather_order", { pID: iPlayerID, mainSelected: mainSelected, targetIndex: e.entityIndex, queue: pressedShift})
					return true;
				}
				// Entangled gold mine rightclick
				else if (mainSelectedName == "nightelf_wisp" && entityName == "nightelf_entangled_gold_mine" && Entities.IsControllableByPlayer( e.entityIndex, iPlayerID )){
					$.Msg("Player "+iPlayerID+" Clicked on a entangled gold mine")
					GameEvents.SendCustomGameEventToServer( "gold_gather_order", { pID: iPlayerID, mainSelected: mainSelected, targetIndex: e.entityIndex, queue: pressedShift })
					return true;
				}
				// Haunted gold mine rightclick
				else if (mainSelectedName == "undead_acolyte" && entityName == "undead_haunted_gold_mine" && Entities.IsControllableByPlayer( e.entityIndex, iPlayerID )){
					$.Msg("Player "+iPlayerID+" Clicked on a haunted gold mine")
					GameEvents.SendCustomGameEventToServer( "gold_gather_order", { pID: iPlayerID, mainSelected: mainSelected, targetIndex: e.entityIndex, queue: pressedShift })
					return true;
				}
				// Repair rightclick
				else if ( (IsCustomBuilding(e.entityIndex) || IsMechanical(e.entityIndex)) && Entities.GetHealthPercent(e.entityIndex) < 100 && Entities.IsControllableByPlayer( e.entityIndex, iPlayerID ) ){
					$.Msg("Player "+iPlayerID+" Clicked on a building or mechanical unit with health missing")
					GameEvents.SendCustomGameEventToServer( "repair_order", { pID: iPlayerID, mainSelected: mainSelected, targetIndex: e.entityIndex, queue: pressedShift })
					return true;
				}
				else if (IsCustomBuilding(e.entityIndex) && mainSelectedName == "orc_peon" && Entities.GetUnitName( e.entityIndex ) == "orc_burrow"){
					$.Msg(" Targeted orc burrow")
					GameEvents.SendCustomGameEventToServer( "burrow_order", { pID: iPlayerID, mainSelected: mainSelected, targetIndex: e.entityIndex })
				}
				return false;
			}
		}
			
	}

	// Building Right Click
	else if (IsCustomBuilding(mainSelected))
	{
		$.Msg("Building Right Click")

		// Click on a target entity
		if (mouseEntities.length > 0)
		{
			for ( var e of mouseEntities )
			{
				var entityName = Entities.GetUnitName(e.entityIndex)
				if ( entityName == "gold_mine" || ( Entities.IsControllableByPlayer( e.entityIndex, iPlayerID ) && (entityName == "nightelf_entangled_gold_mine" || entityName == "undead_haunted_gold_mine")))
				{
					$.Msg(" Targeted gold mine")
					GameEvents.SendCustomGameEventToServer( "building_rally_order", { pID: iPlayerID, mainSelected: mainSelected, rally_type: "mine", targetIndex: e.entityIndex })
				}
				else if ( IsShop( mainSelected ) && Entities.IsControllableByPlayer( e.entityIndex, iPlayerID )  && ( Entities.IsHero( e.entityIndex ) || Entities.IsInventoryEnabled( e.entityIndex )) && Entities.GetRangeToUnit( mainSelected, e.entityIndex) <= 900)
				{
					$.Msg(" Targeted unit to shop")
					GameEvents.SendCustomGameEventToServer( "shop_active_order", { shop: mainSelected, unit: e.entityIndex, targeted: true})
				}
				else
				{
					$.Msg(" Targeted some entity to rally point")
					GameEvents.SendCustomGameEventToServer( "building_rally_order", { pID: iPlayerID, mainSelected: mainSelected, rally_type: "target", targetIndex: e.entityIndex })
				}
				return true;
			}
		}
		// Click on a position
		else
		{
			$.Msg(" Targeted position")
			var GamePos = Game.ScreenXYToWorld(cursor[0], cursor[1]);
			GameEvents.SendCustomGameEventToServer( "building_rally_order", { pID: iPlayerID, mainSelected: mainSelected, rally_type: "position", position: GamePos})
			return true;
		}
	}

	// Unit rightclick
	if (mouseEntities.length > 0)
	{	
		for ( var e of mouseEntities )
		{
			// Moonwell rightclick
			if (IsCustomBuilding(e.entityIndex) && Entities.GetUnitName(e.entityIndex) == "nightelf_moon_well" && Entities.IsControllableByPlayer( e.entityIndex, iPlayerID ) )
			{
				$.Msg("Player "+iPlayerID+" Clicked on moon well to replenish")
				GameEvents.SendCustomGameEventToServer( "moonwell_order", { pID: iPlayerID, mainSelected: mainSelected, targetIndex: e.entityIndex })
				return false; //Keep the unit order
			}

			else
			{
				GameEvents.SendCustomGameEventToServer( "right_click_order", { pID: iPlayerID })
			}
		}
	}

	return false;
}

// Handle Left Button events
function OnLeftButtonPressed() {
    $.Msg("OnLeftButtonPressed")

    var iPlayerID = Players.GetLocalPlayer();
    var mainSelected = Players.GetLocalPlayerPortraitUnit(); 
    var mainSelectedName = Entities.GetUnitName( mainSelected )
    var cursor = GameUI.GetCursorPosition();
    var mouseEntities = GameUI.FindScreenEntities( cursor );
    
    Hide_All_Shops()

    if (mouseEntities.length > 0)
    {
        for ( var e of mouseEntities )
        {
            if ((IsShop(e.entityIndex) && IsAlliedUnit(mainSelected,e.entityIndex)) || IsTavern(e.entityIndex))
            {
                $.Msg("Player "+iPlayerID+" Clicked on a Shop")
                ShowShop(e.entityIndex)

                // Hero or unit with inventory
                if (UnitCanPurchase(mainSelected))
                {
                    GameEvents.SendCustomGameEventToServer( "shop_active_order", { shop: e.entityIndex, unit: mainSelected, targeted: true})
                    return true
                }
            }
        }
    }

    return false
}

function UnitCanPurchase(entIndex) {
    return (Entities.IsRealHero(entIndex) || 
            Entities.GetAbilityByName(entIndex, "human_backpack") != -1 || 
            Entities.GetAbilityByName(entIndex, "orc_backpack") != -1 || 
            Entities.GetAbilityByName(entIndex, "nightelf_backpack") != -1 || 
            Entities.GetAbilityByName(entIndex, "undead_backpack") != -1)
}

function IsBuilder(entIndex) {
	return (CustomNetTables.GetTableValue( "builders", entIndex.toString()))
}

function IsShop(entIndex) {
	return (Entities.GetAbilityByName( entIndex, "ability_shop") != -1)
}

function IsTavern(entIndex) {
    return (Entities.GetUnitLabel( entIndex ) == "tavern")
}

function IsAlliedUnit(entIndex, targetIndex) {
    return (Entities.GetTeamNumber(entIndex) == Entities.GetTeamNumber(targetIndex))
}

function IsNeutralUnit(entIndex) {
    return (Entities.GetTeamNumber(entIndex) == DOTATeam_t.DOTA_TEAM_NEUTRALS)
}

// Main mouse event callback
GameUI.SetMouseCallback( function( eventName, arg ) {
    var CONSUME_EVENT = true;
    var CONTINUE_PROCESSING_EVENT = false;
    var LEFT_CLICK = (arg === 0)
    var RIGHT_CLICK = (arg === 1)

    if ( GameUI.GetClickBehaviors() !== CLICK_BEHAVIORS.DOTA_CLICK_BEHAVIOR_NONE )
        return CONTINUE_PROCESSING_EVENT;

    var mainSelected = Players.GetLocalPlayerPortraitUnit()

    if ( eventName === "pressed" || eventName === "doublepressed")
    {
        // Builder Clicks
        if (IsBuilder(mainSelected))
            if (LEFT_CLICK) 
                return (state == "active") ? SendBuildCommand() : OnLeftButtonPressed();
            else if (RIGHT_CLICK) 
                return OnRightButtonPressed();

        if (LEFT_CLICK) 
            return OnLeftButtonPressed();
        else if (RIGHT_CLICK) 
            return OnRightButtonPressed(); 
        
    }
    return CONTINUE_PROCESSING_EVENT;
} );